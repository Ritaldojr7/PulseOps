package com.pulseops.service;

import com.pulseops.dto.AlertDto;
import com.pulseops.exception.ApiException;
import com.pulseops.model.Alert;
import com.pulseops.model.AlertStatus;
import com.pulseops.model.Severity;
import com.pulseops.repository.AlertRepository;
import com.pulseops.websocket.AlertBroadcaster;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
public class AlertService {

    private static final Logger log = LoggerFactory.getLogger(AlertService.class);

    private final AlertRepository alerts;
    private final AlertBroadcaster broadcaster;

    public AlertService(AlertRepository alerts, AlertBroadcaster broadcaster) {
        this.alerts = alerts;
        this.broadcaster = broadcaster;
    }

    @Transactional
    public Alert createOrUpdate(String serviceName, Severity severity,
                                String title, String description,
                                int eventCount, String fingerprint) {
        Alert alert = alerts.findByFingerprintAndStatus(fingerprint, AlertStatus.ACTIVE)
                .orElseGet(() -> Alert.builder()
                        .serviceName(serviceName)
                        .severity(severity)
                        .status(AlertStatus.ACTIVE)
                        .title(title)
                        .description(description)
                        .eventCount(eventCount)
                        .fingerprint(fingerprint)
                        .build());
        if (alert.getId() != null) {
            alert.setEventCount((alert.getEventCount() == null ? 0 : alert.getEventCount()) + eventCount);
            alert.setDescription(description);
            if (severity.ordinal() > alert.getSeverity().ordinal()) alert.setSeverity(severity);
        }
        Alert saved = alerts.save(alert);
        broadcaster.broadcast(AlertDto.from(saved));
        log.info("Alert {} for service={} severity={} count={}",
                saved.getId(), saved.getServiceName(), saved.getSeverity(), saved.getEventCount());
        return saved;
    }

    @Transactional(readOnly = true)
    public Page<AlertDto> search(String service, Severity severity, AlertStatus status,
                                 int page, int size) {
        var pageable = PageRequest.of(page, Math.min(size, 100),
                Sort.by(Sort.Direction.DESC, "createdAt"));
        Specification<Alert> spec = Specification.where(null);
        if (service != null && !service.isBlank()) {
            String normalized = service.trim().toLowerCase();
            spec = spec.and((root, query, cb) ->
                    cb.equal(cb.lower(root.get("serviceName")), normalized));
        }
        if (severity != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("severity"), severity));
        }
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        return alerts.findAll(spec, pageable).map(AlertDto::from);
    }

    @Transactional(readOnly = true)
    public AlertDto getById(UUID id) {
        return alerts.findById(id).map(AlertDto::from)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Alert not found"));
    }

    @Transactional
    public AlertDto acknowledge(UUID id, String user) {
        Alert a = alerts.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Alert not found"));
        a.setStatus(AlertStatus.ACKNOWLEDGED);
        a.setAcknowledgedBy(user);
        Alert saved = alerts.save(a);
        broadcaster.broadcast(AlertDto.from(saved));
        return AlertDto.from(saved);
    }

    @Transactional
    public AlertDto resolve(UUID id) {
        Alert a = alerts.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Alert not found"));
        a.setStatus(AlertStatus.RESOLVED);
        Alert saved = alerts.save(a);
        broadcaster.broadcast(AlertDto.from(saved));
        return AlertDto.from(saved);
    }
}

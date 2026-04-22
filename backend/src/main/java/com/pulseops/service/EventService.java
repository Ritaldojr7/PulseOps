package com.pulseops.service;

import com.pulseops.dto.EventDto;
import com.pulseops.exception.RateLimitException;
import com.pulseops.kafka.EventProducer;
import com.pulseops.model.EventEntity;
import com.pulseops.model.MonitoredService;
import com.pulseops.model.Severity;
import com.pulseops.repository.EventRepository;
import com.pulseops.repository.MonitoredServiceRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;

@Service
public class EventService {

    private static final Logger log = LoggerFactory.getLogger(EventService.class);

    private final EventProducer producer;
    private final EventRepository events;
    private final MonitoredServiceRepository services;
    private final RedisAnomalyService anomaly;
    private final AlertService alertService;

    public EventService(EventProducer producer,
                        EventRepository events,
                        MonitoredServiceRepository services,
                        RedisAnomalyService anomaly,
                        AlertService alertService) {
        this.producer = producer;
        this.events = events;
        this.services = services;
        this.anomaly = anomaly;
        this.alertService = alertService;
    }

    /** Called by REST controller to ingest. Validates, rate-limits, then publishes to Kafka. */
    public void ingest(EventDto event) {
        if (event.getTimestamp() == null) event.setTimestamp(Instant.now());
        if (!anomaly.allowRequest("ingest:" + event.getServiceName().toLowerCase())) {
            throw new RateLimitException("Rate limit exceeded for service " + event.getServiceName());
        }
        producer.publish(event);
    }

    /** Called by Kafka consumer. Idempotent persistence + sliding-window anomaly detection. */
    @Transactional
    public void process(EventDto event) {
        String dedupKey = computeDedupKey(event);

        if (!anomaly.markIfNew(dedupKey)) {
            log.debug("Duplicate event ignored: {}", dedupKey);
            return;
        }

        EventEntity entity;
        try {
            entity = events.save(EventEntity.builder()
                    .serviceName(event.getServiceName())
                    .type(event.getType())
                    .severity(event.getSeverity())
                    .message(event.getMessage())
                    .metadata(event.getMetadata())
                    .dedupKey(dedupKey)
                    .build());
        } catch (DataIntegrityViolationException ex) {
            log.debug("Race on dedup key: {}", dedupKey);
            return;
        }

        upsertService(event);

        if (event.getSeverity() == Severity.ERROR || event.getSeverity() == Severity.CRITICAL) {
            long count = anomaly.recordError(event.getServiceName());
            if (anomaly.exceedsErrorThreshold(count)) {
                String fingerprint = "anomaly:" + event.getServiceName().toLowerCase() + ":errspike";
                if (anomaly.acquireAlertLock(fingerprint)) {
                    alertService.createOrUpdate(
                            event.getServiceName(),
                            event.getSeverity(),
                            "Error spike detected on " + event.getServiceName(),
                            String.format("%d error events in the last %d seconds. Latest: %s",
                                    count, anomaly.getWindowSeconds(), event.getMessage()),
                            (int) count,
                            fingerprint
                    );
                }
            } else if (event.getSeverity() == Severity.CRITICAL) {
                String fingerprint = "critical:" + event.getServiceName().toLowerCase() + ":" +
                        Integer.toHexString(event.getMessage().hashCode());
                if (anomaly.acquireAlertLock(fingerprint)) {
                    alertService.createOrUpdate(
                            event.getServiceName(),
                            Severity.CRITICAL,
                            "Critical event on " + event.getServiceName(),
                            event.getMessage(),
                            1,
                            fingerprint
                    );
                }
            }
        }

        log.debug("Persisted event id={} service={}", entity.getId(), entity.getServiceName());
    }

    private void upsertService(EventDto event) {
        MonitoredService svc = services.findByNameIgnoreCase(event.getServiceName())
                .orElseGet(() -> MonitoredService.builder()
                        .name(event.getServiceName())
                        .description("Auto-registered from incoming events")
                        .environment(metaString(event, "env", "production"))
                        .build());
        svc.setLastSeenAt(Instant.now());
        svc.setHealthy(event.getSeverity() != Severity.CRITICAL);
        services.save(svc);
    }

    private String metaString(EventDto e, String key, String fallback) {
        if (e.getMetadata() == null) return fallback;
        Object v = e.getMetadata().get(key);
        return v == null ? fallback : v.toString();
    }

    private String computeDedupKey(EventDto e) {
        String raw = e.getServiceName() + "|" + e.getType() + "|" + e.getSeverity()
                + "|" + e.getMessage() + "|" + (e.getTimestamp() == null ? "" : e.getTimestamp().getEpochSecond());
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(raw.getBytes());
            return HexFormat.of().formatHex(digest).substring(0, 40);
        } catch (NoSuchAlgorithmException ex) {
            return Integer.toHexString(raw.hashCode());
        }
    }
}

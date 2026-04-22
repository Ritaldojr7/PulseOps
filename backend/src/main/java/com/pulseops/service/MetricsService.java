package com.pulseops.service;

import com.pulseops.dto.MetricsResponse;
import com.pulseops.model.AlertStatus;
import com.pulseops.repository.AlertRepository;
import com.pulseops.repository.MonitoredServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Service
public class MetricsService {

    private final AlertRepository alerts;
    private final MonitoredServiceRepository services;
    private final ServiceHealthService health;

    public MetricsService(AlertRepository alerts,
                          MonitoredServiceRepository services,
                          ServiceHealthService health) {
        this.alerts = alerts;
        this.services = services;
        this.health = health;
    }

    @Transactional(readOnly = true)
    public MetricsResponse compute() {
        MetricsResponse m = new MetricsResponse();
        m.setTotalAlerts(alerts.count());
        m.setActiveAlerts(alerts.countByStatus(AlertStatus.ACTIVE));
        m.setAcknowledgedAlerts(alerts.countByStatus(AlertStatus.ACKNOWLEDGED));
        m.setResolvedAlerts(alerts.countByStatus(AlertStatus.RESOLVED));
        m.setServicesMonitored(services.count());
        m.setUnhealthyServices(health.unhealthyCount());

        Instant since = Instant.now().minus(Duration.ofHours(24));

        List<MetricsResponse.TimeBucket> buckets = alerts.alertsOverTime(since).stream()
                .map(row -> new MetricsResponse.TimeBucket(
                        toInstant(row[0]),
                        ((Number) row[1]).longValue()
                )).toList();
        m.setAlertsOverTime(buckets);

        List<MetricsResponse.ServiceCount> perService = alerts.errorsPerService(since).stream()
                .map(row -> new MetricsResponse.ServiceCount(
                        (String) row[0],
                        ((Number) row[1]).longValue()
                )).toList();
        m.setErrorsPerService(perService);
        return m;
    }

    private Instant toInstant(Object o) {
        if (o instanceof Timestamp t) return t.toInstant();
        if (o instanceof Instant i) return i;
        return Instant.parse(o.toString());
    }
}

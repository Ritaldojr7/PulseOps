package com.pulseops.dto;

import com.pulseops.model.MonitoredService;

import java.time.Instant;
import java.util.UUID;

public record ServiceDto(
        UUID id,
        String name,
        String description,
        String environment,
        boolean healthy,
        Instant lastSeenAt,
        long errorCountLast15m,
        double errorRatePerMin
) {
    public static ServiceDto from(MonitoredService s, long errorCount, double errorRate) {
        return new ServiceDto(
                s.getId(),
                s.getName(),
                s.getDescription(),
                s.getEnvironment(),
                s.isHealthy(),
                s.getLastSeenAt(),
                errorCount,
                errorRate
        );
    }
}

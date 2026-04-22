package com.pulseops.dto;

import com.pulseops.model.Alert;
import com.pulseops.model.AlertStatus;
import com.pulseops.model.Severity;

import java.time.Instant;
import java.util.UUID;

public record AlertDto(
        UUID id,
        String serviceName,
        Severity severity,
        AlertStatus status,
        String title,
        String description,
        Integer eventCount,
        String fingerprint,
        Instant createdAt,
        Instant updatedAt,
        String acknowledgedBy
) {
    public static AlertDto from(Alert a) {
        return new AlertDto(
                a.getId(),
                a.getServiceName(),
                a.getSeverity(),
                a.getStatus(),
                a.getTitle(),
                a.getDescription(),
                a.getEventCount(),
                a.getFingerprint(),
                a.getCreatedAt(),
                a.getUpdatedAt(),
                a.getAcknowledgedBy()
        );
    }
}

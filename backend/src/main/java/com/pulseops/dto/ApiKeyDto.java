package com.pulseops.dto;

import com.pulseops.model.ApiKey;

import java.time.Instant;
import java.util.UUID;

/** Safe representation of an API key. Never exposes the secret. */
public record ApiKeyDto(
        UUID id,
        String name,
        String prefix,
        boolean revoked,
        String createdBy,
        Instant createdAt,
        Instant lastUsedAt
) {
    public static ApiKeyDto from(ApiKey k) {
        return new ApiKeyDto(
                k.getId(),
                k.getName(),
                k.getPrefix(),
                k.isRevoked(),
                k.getCreatedBy(),
                k.getCreatedAt(),
                k.getLastUsedAt()
        );
    }
}

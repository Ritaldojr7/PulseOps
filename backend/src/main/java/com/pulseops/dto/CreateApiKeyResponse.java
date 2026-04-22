package com.pulseops.dto;

import java.time.Instant;
import java.util.UUID;

/**
 * Returned exactly once on creation. The plaintext secret is NOT stored and cannot
 * be retrieved again — the caller must save it immediately.
 */
public record CreateApiKeyResponse(
        UUID id,
        String name,
        String prefix,
        String secret,
        Instant createdAt
) {}

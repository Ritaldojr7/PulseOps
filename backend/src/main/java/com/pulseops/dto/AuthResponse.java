package com.pulseops.dto;

import java.util.Set;

public record AuthResponse(
        String token,
        String tokenType,
        long expiresAt,
        String email,
        String fullName,
        Set<String> roles
) {}

package com.pulseops.service;

import com.pulseops.exception.RateLimitException;
import com.pulseops.util.ClientIp;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Brute-force mitigation for unauthenticated public auth endpoints. Uses the same
 * Redis sliding window as event ingest, with separate (lower) limits.
 */
@Service
public class AuthRateLimitService {

    private final RedisAnomalyService anomaly;

    @Value("${pulseops.security.auth-login-attempts-per-minute:30}")
    private long loginAttemptsPerMinute;

    @Value("${pulseops.security.auth-register-attempts-per-minute:10}")
    private long registerAttemptsPerMinute;

    public AuthRateLimitService(RedisAnomalyService anomaly) {
        this.anomaly = anomaly;
    }

    public void requireLoginAllowance(HttpServletRequest request) {
        String ip = ClientIp.from(request);
        if (!anomaly.allowRequestWithLimit("auth:login:" + ip, loginAttemptsPerMinute)) {
            throw new RateLimitException("Too many login attempts. Try again later.");
        }
    }

    public void requireRegisterAllowance(HttpServletRequest request) {
        String ip = ClientIp.from(request);
        if (!anomaly.allowRequestWithLimit("auth:register:" + ip, registerAttemptsPerMinute)) {
            throw new RateLimitException("Too many registration attempts. Try again later.");
        }
    }
}

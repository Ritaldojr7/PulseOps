package com.pulseops.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.Set;

/**
 * Redis-backed sliding window for:
 *  - error counts per service (for anomaly detection)
 *  - rate limiting (per service / API key)
 *  - dedup of incoming events
 *
 * Uses sorted sets keyed by epoch-millis.
 */
@Service
public class RedisAnomalyService {

    private static final Logger log = LoggerFactory.getLogger(RedisAnomalyService.class);

    private static final String KEY_WINDOW_PREFIX = "pulseops:window:errors:";
    private static final String KEY_RATE_PREFIX   = "pulseops:rate:";
    private static final String KEY_DEDUP_PREFIX  = "pulseops:dedup:";
    private static final String KEY_ALERT_FP      = "pulseops:alert:fp:";

    private final StringRedisTemplate redis;

    @Value("${pulseops.anomaly.window-seconds}")
    private long windowSeconds;

    @Value("${pulseops.anomaly.error-threshold}")
    private long errorThreshold;

    @Value("${pulseops.anomaly.rate-limit-per-minute}")
    private long rateLimitPerMinute;

    public RedisAnomalyService(StringRedisTemplate redis) {
        this.redis = redis;
    }

    /** Returns true if the event was new (not a duplicate). 5 minute dedup window. */
    public boolean markIfNew(String dedupKey) {
        if (dedupKey == null || dedupKey.isBlank()) return true;
        String key = KEY_DEDUP_PREFIX + dedupKey;
        Boolean ok = redis.opsForValue().setIfAbsent(key, "1", Duration.ofMinutes(5));
        return Boolean.TRUE.equals(ok);
    }

    /** Sliding-window rate limit per identifier (ingest, etc.) — uses global per-minute cap. */
    public boolean allowRequest(String identifier) {
        return allowRequestWithLimit(identifier, rateLimitPerMinute);
    }

    /**
     * Sliding-window rate limit: max {@code maxPerMinute} requests per 60s rolling window
     * for the given identifier (e.g. {@code auth:login:1.2.3.4} or {@code ingest:my-service}).
     */
    public boolean allowRequestWithLimit(String identifier, long maxPerMinute) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - 60_000L;
        String key = KEY_RATE_PREFIX + identifier;
        try {
            redis.opsForZSet().removeRangeByScore(key, 0, windowStart);
            Long size = redis.opsForZSet().zCard(key);
            if (size != null && size >= maxPerMinute) {
                return false;
            }
            redis.opsForZSet().add(key, String.valueOf(now), now);
            redis.expire(key, Duration.ofMinutes(2));
            return true;
        } catch (Exception ex) {
            log.warn("Rate-limit Redis failure (fail-open): {}", ex.getMessage());
            return true;
        }
    }

    /** Record an error event in the sliding window. Returns the current count in window. */
    public long recordError(String serviceName) {
        long now = Instant.now().toEpochMilli();
        long windowStart = now - (windowSeconds * 1000L);
        String key = KEY_WINDOW_PREFIX + serviceName.toLowerCase();
        try {
            redis.opsForZSet().add(key, now + ":" + Math.random(), now);
            redis.opsForZSet().removeRangeByScore(key, 0, windowStart);
            redis.expire(key, Duration.ofSeconds(windowSeconds * 2));
            Long count = redis.opsForZSet().zCard(key);
            return count == null ? 0 : count;
        } catch (Exception ex) {
            log.warn("Sliding-window Redis failure: {}", ex.getMessage());
            return 0;
        }
    }

    public boolean exceedsErrorThreshold(long count) {
        return count >= errorThreshold;
    }

    /** Acquire a short lock for a fingerprint so we don't fire duplicate alerts in quick succession. */
    public boolean acquireAlertLock(String fingerprint) {
        String key = KEY_ALERT_FP + fingerprint;
        Boolean ok = redis.opsForValue().setIfAbsent(key, "1", Duration.ofMinutes(2));
        return Boolean.TRUE.equals(ok);
    }

    public Set<String> recentRateKeys() {
        return redis.keys(KEY_RATE_PREFIX + "*");
    }

    public long getWindowSeconds() { return windowSeconds; }
    public long getErrorThreshold() { return errorThreshold; }
}

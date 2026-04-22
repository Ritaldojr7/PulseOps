package com.pulseops.util;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.util.StringUtils;

/**
 * Resolves the client address behind reverse proxies (Cloudflare, load balancers).
 * Use with {@code server.forward-headers-strategy} so forwarded headers are trusted.
 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String from(HttpServletRequest request) {
        String cf = first(request.getHeader("CF-Connecting-IP"));
        if (StringUtils.hasText(cf) && isSaneIp(cf)) {
            return cf.trim();
        }
        String xff = first(request.getHeader("X-Forwarded-For"));
        if (StringUtils.hasText(xff)) {
            // First hop is the original client when chain is: client, proxy, proxy
            int comma = xff.indexOf(',');
            String first = (comma > 0 ? xff.substring(0, comma) : xff).trim();
            if (isSaneIp(first)) {
                return first;
            }
        }
        String real = first(request.getHeader("X-Real-IP"));
        if (StringUtils.hasText(real) && isSaneIp(real)) {
            return real.trim();
        }
        return request.getRemoteAddr() == null ? "unknown" : request.getRemoteAddr();
    }

    private static String first(String h) {
        return h == null ? "" : h;
    }

    private static boolean isSaneIp(String s) {
        if (s.isBlank() || s.length() > 80) {
            return false;
        }
        // Avoid header injection in Redis keys
        return !s.contains("\r") && !s.contains("\n");
    }
}

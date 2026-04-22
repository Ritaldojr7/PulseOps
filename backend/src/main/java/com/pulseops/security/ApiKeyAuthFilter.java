package com.pulseops.security;

import com.pulseops.model.ApiKey;
import com.pulseops.service.ApiKeyService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Authenticates requests carrying an `X-API-Key` header. Successful keys are given
 * ROLE_USER and ROLE_SERVICE so they can call ingestion endpoints but not admin APIs.
 */
@Component
public class ApiKeyAuthFilter extends OncePerRequestFilter {

    public static final String HEADER = "X-API-Key";

    private final ApiKeyService apiKeyService;

    public ApiKeyAuthFilter(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                    HttpServletResponse response,
                                    FilterChain chain) throws ServletException, IOException {
        String presented = request.getHeader(HEADER);
        if (StringUtils.hasText(presented)
                && SecurityContextHolder.getContext().getAuthentication() == null) {

            apiKeyService.verify(presented).ifPresent(key -> authenticate(request, key));
        }
        chain.doFilter(request, response);
    }

    private void authenticate(HttpServletRequest request, ApiKey key) {
        List<SimpleGrantedAuthority> authorities = List.of(
                new SimpleGrantedAuthority("ROLE_USER"),
                new SimpleGrantedAuthority("ROLE_SERVICE")
        );
        String principal = "apikey:" + key.getPrefix() + " (" + key.getName() + ")";
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(principal, null, authorities);
        auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
        SecurityContextHolder.getContext().setAuthentication(auth);
        // bump last-used asynchronously so the hot path stays fast
        apiKeyService.touch(key.getId());
    }
}

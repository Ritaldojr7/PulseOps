package com.pulseops.controller;

import com.pulseops.dto.AuthResponse;
import com.pulseops.dto.LoginRequest;
import com.pulseops.dto.RegisterRequest;
import com.pulseops.service.AuthService;
import com.pulseops.service.AuthRateLimitService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final AuthRateLimitService authRateLimitService;

    public AuthController(AuthService authService, AuthRateLimitService authRateLimitService) {
        this.authService = authService;
        this.authRateLimitService = authRateLimitService;
    }

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(
            @Valid @RequestBody RegisterRequest req,
            HttpServletRequest request) {
        authRateLimitService.requireRegisterAllowance(request);
        return ResponseEntity.ok(authService.register(req));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @Valid @RequestBody LoginRequest req,
            HttpServletRequest request) {
        authRateLimitService.requireLoginAllowance(request);
        return ResponseEntity.ok(authService.login(req));
    }
}

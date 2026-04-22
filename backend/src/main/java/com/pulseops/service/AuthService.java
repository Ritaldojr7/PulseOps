package com.pulseops.service;

import com.pulseops.dto.AuthResponse;
import com.pulseops.dto.LoginRequest;
import com.pulseops.dto.RegisterRequest;
import com.pulseops.exception.ApiException;
import com.pulseops.model.Role;
import com.pulseops.model.User;
import com.pulseops.repository.UserRepository;
import com.pulseops.security.JwtTokenProvider;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthService {

    private static final String OWNER_ADMIN_EMAIL = "ritwik.mukherjee68@gmail.com";

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtTokenProvider tokens;

    public AuthService(UserRepository users, PasswordEncoder encoder, JwtTokenProvider tokens) {
        this.users = users;
        this.encoder = encoder;
        this.tokens = tokens;
    }

    @Transactional
    public AuthResponse register(RegisterRequest req) {
        String email = normalizeEmail(req.email());
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email already registered");
        }
        Set<Role> roles = new HashSet<>();
        roles.add(Role.USER);
        // First user created becomes ADMIN — bootstrap convenience
        if (users.count() == 0) {
            roles.add(Role.ADMIN);
        }
        if (isOwnerAdminEmail(email)) {
            roles.add(Role.ADMIN);
        }
        User user = User.builder()
                .email(email)
                .fullName(req.fullName())
                .passwordHash(encoder.encode(req.password()))
                .roles(roles)
                .enabled(true)
                .build();
        users.save(user);
        return issue(user);
    }

    @Transactional
    public AuthResponse login(LoginRequest req) {
        String email = normalizeEmail(req.email());
        User user = users.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));
        if (!user.isEnabled()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Account disabled");
        }
        if (!encoder.matches(req.password(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }
        if (isOwnerAdminEmail(email) && !user.getRoles().contains(Role.ADMIN)) {
            Set<Role> updatedRoles = new HashSet<>(user.getRoles());
            updatedRoles.add(Role.ADMIN);
            updatedRoles.add(Role.USER);
            user.setRoles(updatedRoles);
            users.save(user);
        }
        return issue(user);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private boolean isOwnerAdminEmail(String email) {
        return OWNER_ADMIN_EMAIL.equalsIgnoreCase(email);
    }

    private AuthResponse issue(User user) {
        JwtTokenProvider.TokenInfo info = tokens.generate(user);
        Set<String> roles = user.getRoles().stream().map(Enum::name).collect(Collectors.toSet());
        return new AuthResponse(info.token(), "Bearer", info.expiresAt(),
                user.getEmail(), user.getFullName(), roles);
    }
}

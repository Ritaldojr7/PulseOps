package com.pulseops.service;

import com.pulseops.dto.ApiKeyDto;
import com.pulseops.dto.CreateApiKeyRequest;
import com.pulseops.dto.CreateApiKeyResponse;
import com.pulseops.exception.ApiException;
import com.pulseops.model.ApiKey;
import com.pulseops.repository.ApiKeyRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Issues and verifies API keys used for machine-to-machine event ingestion.
 * Only the SHA-256 hash of the secret is ever persisted.
 */
@Service
public class ApiKeyService {

    private static final Logger log = LoggerFactory.getLogger(ApiKeyService.class);
    private static final String KEY_PREFIX = "pulseops_";
    private static final int SECRET_BYTES = 32;

    private final ApiKeyRepository repository;
    private final SecureRandom random = new SecureRandom();

    public ApiKeyService(ApiKeyRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public CreateApiKeyResponse create(CreateApiKeyRequest request, String createdBy) {
        byte[] bytes = new byte[SECRET_BYTES];
        random.nextBytes(bytes);
        String secretPart = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        String plaintext = KEY_PREFIX + secretPart;
        String prefix = secretPart.substring(0, Math.min(8, secretPart.length()));

        ApiKey key = ApiKey.builder()
                .name(request.name())
                .prefix(prefix)
                .keyHash(sha256(plaintext))
                .createdBy(createdBy)
                .revoked(false)
                .build();
        ApiKey saved = repository.save(key);
        log.info("Created API key id={} name={} createdBy={}", saved.getId(), saved.getName(), createdBy);

        return new CreateApiKeyResponse(
                saved.getId(),
                saved.getName(),
                saved.getPrefix(),
                plaintext,
                saved.getCreatedAt()
        );
    }

    @Transactional(readOnly = true)
    public List<ApiKeyDto> list() {
        return repository.findAllByOrderByCreatedAtDesc().stream()
                .map(ApiKeyDto::from)
                .toList();
    }

    @Transactional
    public ApiKeyDto revoke(UUID id) {
        ApiKey key = repository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "API key not found"));
        key.setRevoked(true);
        return ApiKeyDto.from(repository.save(key));
    }

    @Transactional
    public void delete(UUID id) {
        if (!repository.existsById(id)) {
            throw new ApiException(HttpStatus.NOT_FOUND, "API key not found");
        }
        repository.deleteById(id);
    }

    /** Used by the auth filter. Returns the active key or empty. */
    @Transactional(readOnly = true)
    public Optional<ApiKey> verify(String plaintext) {
        if (plaintext == null || plaintext.isBlank()) return Optional.empty();
        return repository.findByKeyHash(sha256(plaintext.trim()))
                .filter(k -> !k.isRevoked());
    }

    /** Bump last-used asynchronously so the auth filter stays fast. */
    @Async("ingestExecutor")
    @Transactional
    public void touch(UUID id) {
        repository.findById(id).ifPresent(k -> {
            k.setLastUsedAt(Instant.now());
            repository.save(k);
        });
    }

    static String sha256(String input) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            byte[] digest = md.digest(input.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (Exception e) {
            throw new IllegalStateException("SHA-256 unavailable", e);
        }
    }
}

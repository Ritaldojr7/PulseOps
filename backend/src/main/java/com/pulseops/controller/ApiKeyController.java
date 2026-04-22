package com.pulseops.controller;

import com.pulseops.dto.ApiKeyDto;
import com.pulseops.dto.CreateApiKeyRequest;
import com.pulseops.dto.CreateApiKeyResponse;
import com.pulseops.service.ApiKeyService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/apikeys")
@PreAuthorize("hasRole('ADMIN')")
public class ApiKeyController {

    private final ApiKeyService apiKeyService;

    public ApiKeyController(ApiKeyService apiKeyService) {
        this.apiKeyService = apiKeyService;
    }

    @GetMapping
    public List<ApiKeyDto> list() {
        return apiKeyService.list();
    }

    @PostMapping
    public CreateApiKeyResponse create(@Valid @RequestBody CreateApiKeyRequest request,
                                       Authentication auth) {
        return apiKeyService.create(request, auth.getName());
    }

    @PostMapping("/{id}/revoke")
    public ApiKeyDto revoke(@PathVariable UUID id) {
        return apiKeyService.revoke(id);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable UUID id) {
        apiKeyService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

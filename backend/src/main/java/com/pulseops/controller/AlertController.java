package com.pulseops.controller;

import com.pulseops.dto.AlertDto;
import com.pulseops.model.AlertStatus;
import com.pulseops.model.Severity;
import com.pulseops.service.AlertService;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/alerts")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class AlertController {

    private final AlertService alertService;

    public AlertController(AlertService alertService) {
        this.alertService = alertService;
    }

    @GetMapping
    public Page<AlertDto> list(
            @RequestParam(required = false) String service,
            @RequestParam(required = false) Severity severity,
            @RequestParam(required = false) AlertStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return alertService.search(service, severity, status, page, size);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AlertDto> get(@PathVariable UUID id) {
        return ResponseEntity.ok(alertService.getById(id));
    }

    @PostMapping("/{id}/acknowledge")
    public ResponseEntity<AlertDto> acknowledge(@PathVariable UUID id, Authentication auth) {
        return ResponseEntity.ok(alertService.acknowledge(id, auth.getName()));
    }

    @PostMapping("/{id}/resolve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<AlertDto> resolve(@PathVariable UUID id) {
        return ResponseEntity.ok(alertService.resolve(id));
    }
}

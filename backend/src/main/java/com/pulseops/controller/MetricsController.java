package com.pulseops.controller;

import com.pulseops.dto.MetricsResponse;
import com.pulseops.service.MetricsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/metrics")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class MetricsController {

    private final MetricsService metricsService;

    public MetricsController(MetricsService metricsService) {
        this.metricsService = metricsService;
    }

    @GetMapping
    public MetricsResponse summary() {
        return metricsService.compute();
    }
}

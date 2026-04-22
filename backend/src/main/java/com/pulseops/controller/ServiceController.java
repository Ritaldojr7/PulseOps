package com.pulseops.controller;

import com.pulseops.dto.ServiceDto;
import com.pulseops.service.ServiceHealthService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/services")
@PreAuthorize("hasAnyRole('USER','ADMIN')")
public class ServiceController {

    private final ServiceHealthService health;

    public ServiceController(ServiceHealthService health) {
        this.health = health;
    }

    @GetMapping
    public List<ServiceDto> list() {
        return health.listAll();
    }

    @GetMapping("/{name}")
    public ServiceDto get(@PathVariable String name) {
        return health.getByName(name);
    }
}

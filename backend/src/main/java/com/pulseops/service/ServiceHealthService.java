package com.pulseops.service;

import com.pulseops.dto.ServiceDto;
import com.pulseops.model.MonitoredService;
import com.pulseops.repository.EventRepository;
import com.pulseops.repository.MonitoredServiceRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

@Service
public class ServiceHealthService {

    private final MonitoredServiceRepository services;
    private final EventRepository events;

    public ServiceHealthService(MonitoredServiceRepository services, EventRepository events) {
        this.services = services;
        this.events = events;
    }

    @Transactional(readOnly = true)
    public List<ServiceDto> listAll() {
        Instant since = Instant.now().minus(Duration.ofMinutes(15));
        return services.findAll().stream()
                .map(s -> toDto(s, since))
                .sorted(Comparator.comparing(ServiceDto::name, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public ServiceDto getByName(String name) {
        Instant since = Instant.now().minus(Duration.ofMinutes(15));
        return services.findByNameIgnoreCase(name)
                .map(s -> toDto(s, since))
                .orElseThrow(() -> new com.pulseops.exception.ApiException(
                        org.springframework.http.HttpStatus.NOT_FOUND, "Service not found"));
    }

    public long unhealthyCount() {
        return services.findAll().stream().filter(s -> !s.isHealthy()).count();
    }

    private ServiceDto toDto(MonitoredService s, Instant since) {
        long count = events.countErrorsSince(s.getName(), since);
        double rate = count / 15.0;
        return ServiceDto.from(s, count, rate);
    }
}

package com.pulseops.repository;

import com.pulseops.model.MonitoredService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface MonitoredServiceRepository extends JpaRepository<MonitoredService, UUID> {
    Optional<MonitoredService> findByNameIgnoreCase(String name);
}

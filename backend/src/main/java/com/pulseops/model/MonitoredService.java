package com.pulseops.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "services", indexes = {
        @Index(name = "idx_services_name", columnList = "name", unique = true)
})
@Getter @Setter
@NoArgsConstructor @AllArgsConstructor @Builder
public class MonitoredService {

    @Id
    @GeneratedValue
    private UUID id;

    @Column(nullable = false, unique = true, length = 120)
    private String name;

    @Column(length = 255)
    private String description;

    @Column(length = 60)
    private String environment;

    @Column(nullable = false)
    @Builder.Default
    private boolean healthy = true;

    @Column(nullable = false, updatable = false)
    private Instant createdAt;

    private Instant lastSeenAt;

    @PrePersist
    void prePersist() {
        if (createdAt == null) createdAt = Instant.now();
    }
}

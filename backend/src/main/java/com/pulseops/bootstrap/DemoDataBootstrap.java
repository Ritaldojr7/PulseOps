package com.pulseops.bootstrap;

import com.pulseops.dto.EventDto;
import com.pulseops.kafka.EventProducer;
import com.pulseops.model.EventType;
import com.pulseops.model.Role;
import com.pulseops.model.Severity;
import com.pulseops.model.User;
import com.pulseops.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

/**
 * Seeds an admin user and (optionally) emits demo telemetry so the dashboard
 * shows live data out of the box.
 */
@Component
public class DemoDataBootstrap {

    private static final Logger log = LoggerFactory.getLogger(DemoDataBootstrap.class);

    private static final List<String> SERVICES = List.of(
            "checkout-service", "auth-service", "payments-service",
            "inventory-service", "search-service", "notifications-service"
    );

    private static final List<String> LOG_MESSAGES = List.of(
            "Request handled successfully",
            "Cache hit for user profile",
            "Background job completed",
            "Healthcheck OK"
    );

    private static final List<String> ERROR_MESSAGES = List.of(
            "NullPointerException in OrderHandler.process",
            "Database connection timeout after 30s",
            "Downstream service returned 500",
            "Unable to publish to message broker",
            "OOM in worker pool"
    );

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final EventProducer producer;

    @Value("${pulseops.demo.enabled:true}")
    private boolean demoEnabled;

    @Value("${pulseops.demo.admin-email:admin@pulseops.io}")
    private String adminEmail;

    @Value("${pulseops.demo.admin-password:Admin@12345}")
    private String adminPassword;

    public DemoDataBootstrap(UserRepository users, PasswordEncoder encoder, EventProducer producer) {
        this.users = users;
        this.encoder = encoder;
        this.producer = producer;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void seed() {
        if (users.findByEmailIgnoreCase(adminEmail).isEmpty()) {
            User admin = User.builder()
                    .email(adminEmail.toLowerCase())
                    .fullName("PulseOps Admin")
                    .passwordHash(encoder.encode(adminPassword))
                    .roles(new HashSet<>(Set.of(Role.ADMIN, Role.USER)))
                    .enabled(true)
                    .build();
            users.save(admin);
            log.info("Seeded admin user: {} / {}", adminEmail, adminPassword);
        }
    }

    /** Emit a small batch of synthetic events every 5s when demo mode is enabled. */
    @Scheduled(fixedDelay = 5000, initialDelay = 8000)
    public void emitSyntheticTraffic() {
        if (!demoEnabled) return;
        ThreadLocalRandom rnd = ThreadLocalRandom.current();
        int batch = rnd.nextInt(3, 10);
        for (int i = 0; i < batch; i++) {
            String service = SERVICES.get(rnd.nextInt(SERVICES.size()));
            boolean errorBurst = rnd.nextInt(100) < 25;
            Severity sev;
            EventType type;
            String message;
            if (errorBurst) {
                sev = rnd.nextInt(100) < 15 ? Severity.CRITICAL : Severity.ERROR;
                type = EventType.ERROR;
                message = ERROR_MESSAGES.get(rnd.nextInt(ERROR_MESSAGES.size()));
            } else if (rnd.nextInt(100) < 10) {
                sev = Severity.WARNING;
                type = EventType.LOG;
                message = "Latency above SLO: " + (200 + rnd.nextInt(800)) + "ms";
            } else {
                sev = Severity.INFO;
                type = rnd.nextBoolean() ? EventType.LOG : EventType.METRIC;
                message = LOG_MESSAGES.get(rnd.nextInt(LOG_MESSAGES.size()));
            }

            Map<String, Object> meta = new HashMap<>();
            meta.put("env", "production");
            meta.put("host", "node-" + rnd.nextInt(1, 20));
            meta.put("latencyMs", rnd.nextInt(5, 1500));

            EventDto e = new EventDto(service, type, sev, message, meta, Instant.now());
            producer.publish(e);
        }
    }
}

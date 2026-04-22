package com.pulseops.repository;

import com.pulseops.model.Alert;
import com.pulseops.model.AlertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AlertRepository extends JpaRepository<Alert, UUID>, JpaSpecificationExecutor<Alert> {

    Optional<Alert> findByFingerprintAndStatus(String fingerprint, AlertStatus status);

    long countByStatus(AlertStatus status);

    @Query(value = """
            select date_trunc('minute', created_at) as bucket, count(*) as total
            from alerts
            where created_at >= :since
            group by bucket
            order by bucket asc
            """, nativeQuery = true)
    List<Object[]> alertsOverTime(@Param("since") Instant since);

    @Query(value = """
            select service_name, count(*) as total
            from alerts
            where created_at >= :since
            group by service_name
            order by total desc
            """, nativeQuery = true)
    List<Object[]> errorsPerService(@Param("since") Instant since);
}

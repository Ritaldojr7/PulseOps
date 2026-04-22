package com.pulseops.repository;

import com.pulseops.model.EventEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface EventRepository extends JpaRepository<EventEntity, UUID> {

    Optional<EventEntity> findByDedupKey(String dedupKey);

    @Query("""
            select e from EventEntity e
            where e.serviceName = :service
            and e.createdAt >= :since
            order by e.createdAt desc
            """)
    List<EventEntity> findRecentByService(@Param("service") String serviceName,
                                          @Param("since") Instant since);

    @Query(value = """
            select count(*) from events
            where service_name = :service
              and severity in ('ERROR','CRITICAL')
              and created_at >= :since
            """, nativeQuery = true)
    long countErrorsSince(@Param("service") String serviceName,
                          @Param("since") Instant since);
}

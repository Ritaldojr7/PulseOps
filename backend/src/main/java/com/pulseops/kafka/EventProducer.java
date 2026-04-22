package com.pulseops.kafka;

import com.pulseops.dto.EventDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Component;

import java.util.concurrent.CompletableFuture;

@Component
public class EventProducer {

    private static final Logger log = LoggerFactory.getLogger(EventProducer.class);

    private final KafkaTemplate<String, EventDto> kafkaTemplate;

    @Value("${pulseops.kafka.topic.events}")
    private String topic;

    public EventProducer(KafkaTemplate<String, EventDto> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    public CompletableFuture<Void> publish(EventDto event) {
        String key = event.getServiceName();
        return kafkaTemplate.send(topic, key, event)
                .thenAccept(result -> log.debug("Published event for service={} offset={}",
                        key, result.getRecordMetadata().offset()))
                .exceptionally(ex -> {
                    log.error("Failed to publish event for service={}", key, ex);
                    return null;
                });
    }
}

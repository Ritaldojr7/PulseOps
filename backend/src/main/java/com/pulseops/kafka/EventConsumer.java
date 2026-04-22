package com.pulseops.kafka;

import com.pulseops.dto.EventDto;
import com.pulseops.service.EventService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.annotation.RetryableTopic;
import org.springframework.kafka.retrytopic.DltStrategy;
import org.springframework.retry.annotation.Backoff;
import org.springframework.stereotype.Component;

@Component
public class EventConsumer {

    private static final Logger log = LoggerFactory.getLogger(EventConsumer.class);

    private final EventService eventService;

    public EventConsumer(EventService eventService) {
        this.eventService = eventService;
    }

    @RetryableTopic(
            attempts = "4",
            backoff = @Backoff(delay = 1000, multiplier = 2.0),
            dltStrategy = DltStrategy.FAIL_ON_ERROR,
            autoCreateTopics = "true"
    )
    @KafkaListener(
            topics = "${pulseops.kafka.topic.events}",
            groupId = "${spring.kafka.consumer.group-id}"
    )
    public void onEvent(EventDto event) {
        try {
            eventService.process(event);
        } catch (Exception ex) {
            log.error("Failed to process event service={} message={}",
                    event.getServiceName(), event.getMessage(), ex);
            throw ex;
        }
    }

    @KafkaListener(topics = "${pulseops.kafka.topic.events}-dlt",
            groupId = "${spring.kafka.consumer.group-id}-dlt")
    public void onDeadLetter(EventDto event) {
        log.error("DLT event received service={} message={}",
                event.getServiceName(), event.getMessage());
    }
}

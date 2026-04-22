package com.pulseops.websocket;

import com.pulseops.dto.AlertDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

@Component
public class AlertBroadcaster {

    private static final Logger log = LoggerFactory.getLogger(AlertBroadcaster.class);

    public static final String TOPIC_ALERTS = "/topic/alerts";

    private final SimpMessagingTemplate messaging;

    public AlertBroadcaster(SimpMessagingTemplate messaging) {
        this.messaging = messaging;
    }

    public void broadcast(AlertDto alert) {
        try {
            messaging.convertAndSend(TOPIC_ALERTS, alert);
        } catch (Exception ex) {
            log.warn("Failed to broadcast alert id={} error={}", alert.id(), ex.getMessage());
        }
    }
}

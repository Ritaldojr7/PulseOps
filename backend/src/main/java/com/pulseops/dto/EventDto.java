package com.pulseops.dto;

import com.pulseops.model.EventType;
import com.pulseops.model.Severity;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.Instant;
import java.util.Map;

public class EventDto {
    @NotBlank @Size(max = 120)
    private String serviceName;

    @NotNull
    private EventType type;

    @NotNull
    private Severity severity;

    @NotBlank @Size(max = 1000)
    private String message;

    private Map<String, Object> metadata;

    private Instant timestamp;

    public EventDto() {}

    public EventDto(String serviceName, EventType type, Severity severity,
                    String message, Map<String, Object> metadata, Instant timestamp) {
        this.serviceName = serviceName;
        this.type = type;
        this.severity = severity;
        this.message = message;
        this.metadata = metadata;
        this.timestamp = timestamp;
    }

    public String getServiceName() { return serviceName; }
    public void setServiceName(String serviceName) { this.serviceName = serviceName; }
    public EventType getType() { return type; }
    public void setType(EventType type) { this.type = type; }
    public Severity getSeverity() { return severity; }
    public void setSeverity(Severity severity) { this.severity = severity; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Map<String, Object> getMetadata() { return metadata; }
    public void setMetadata(Map<String, Object> metadata) { this.metadata = metadata; }
    public Instant getTimestamp() { return timestamp; }
    public void setTimestamp(Instant timestamp) { this.timestamp = timestamp; }
}

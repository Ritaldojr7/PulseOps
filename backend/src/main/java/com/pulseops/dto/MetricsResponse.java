package com.pulseops.dto;

import java.time.Instant;
import java.util.List;

public class MetricsResponse {

    public record TimeBucket(Instant time, long count) {}
    public record ServiceCount(String service, long count) {}

    private long totalAlerts;
    private long activeAlerts;
    private long acknowledgedAlerts;
    private long resolvedAlerts;
    private long servicesMonitored;
    private long unhealthyServices;
    private List<TimeBucket> alertsOverTime;
    private List<ServiceCount> errorsPerService;

    public MetricsResponse() {}

    public long getTotalAlerts() { return totalAlerts; }
    public void setTotalAlerts(long v) { this.totalAlerts = v; }
    public long getActiveAlerts() { return activeAlerts; }
    public void setActiveAlerts(long v) { this.activeAlerts = v; }
    public long getAcknowledgedAlerts() { return acknowledgedAlerts; }
    public void setAcknowledgedAlerts(long v) { this.acknowledgedAlerts = v; }
    public long getResolvedAlerts() { return resolvedAlerts; }
    public void setResolvedAlerts(long v) { this.resolvedAlerts = v; }
    public long getServicesMonitored() { return servicesMonitored; }
    public void setServicesMonitored(long v) { this.servicesMonitored = v; }
    public long getUnhealthyServices() { return unhealthyServices; }
    public void setUnhealthyServices(long v) { this.unhealthyServices = v; }
    public List<TimeBucket> getAlertsOverTime() { return alertsOverTime; }
    public void setAlertsOverTime(List<TimeBucket> v) { this.alertsOverTime = v; }
    public List<ServiceCount> getErrorsPerService() { return errorsPerService; }
    public void setErrorsPerService(List<ServiceCount> v) { this.errorsPerService = v; }
}

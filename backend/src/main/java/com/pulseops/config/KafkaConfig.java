package com.pulseops.config;

import org.apache.kafka.clients.admin.NewTopic;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.config.TopicBuilder;

@Configuration
public class KafkaConfig {

    @Value("${pulseops.kafka.topic.events}")
    private String eventsTopic;

    @Value("${pulseops.kafka.topic.alerts}")
    private String alertsTopic;

    @Bean
    public NewTopic eventsTopic() {
        return TopicBuilder.name(eventsTopic).partitions(6).replicas(1).build();
    }

    @Bean
    public NewTopic alertsTopic() {
        return TopicBuilder.name(alertsTopic).partitions(3).replicas(1).build();
    }
}

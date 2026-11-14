package com.kimhak.niche.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;


@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/connection")
                .setAllowedOriginPatterns("*")
                .setHandshakeHandler(new NameHandshakeHandler());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {

        // Server-to-client destinations
        registry.enableSimpleBroker(
                "/topic",
                "/queue",
                "/event"
        );

        // Client-to-server destinations
        registry.setApplicationDestinationPrefixes(
                "/user-app",
                "/admin-app"
        );

        // Private user destinations
        registry.setUserDestinationPrefix("/user");
    }
}


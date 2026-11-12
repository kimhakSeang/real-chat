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
        // Endpoint for clients to connect
        registry.addEndpoint("/connection")
                .setAllowedOriginPatterns("*")
                .setHandshakeHandler(new NameHandshakeHandler());   // NEW
//                .withSockJS() // Enable SockJS fallback
                ;
    }
    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Prefix for topics (server-to-client)
        registry.enableSimpleBroker("/topic", "/event", "/user");
        // Prefix for client-to-server messages
        registry.setApplicationDestinationPrefixes("/user-app", "/admin-app");
    }
}

package com.vintage.app.config;

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
        registry.addEndpoint("/connection") // handshak - create websocket connection
                .setAllowedOriginPatterns("http://localhost:63342")
                .setHandshakeHandler(new NameHandshakeHandler());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {

        // Broker prefix (Centrally for pub-sub)
        registry.enableSimpleBroker(
                "/topic",
                "/queue",
                "/event"
        );

        // Client-to-server (ex: browser call service to register user login)
        registry.setApplicationDestinationPrefixes(
                "/user-app",
                "/admin-app"
        );

        // Server to Client (ex: server forward message from sender to receiver browser)
        registry.setUserDestinationPrefix("/user");
    }
}


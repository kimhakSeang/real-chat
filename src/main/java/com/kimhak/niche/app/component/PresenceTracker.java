package com.kimhak.niche.app.component;

import lombok.RequiredArgsConstructor;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.security.Principal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class PresenceTracker {
    private final Map<String, String> sessionsRegistry = new ConcurrentHashMap<>();
    private final SimpMessagingTemplate template;

    @EventListener
    public void connected(SessionConnectedEvent sessionConnectedEvent){
        Principal user = sessionConnectedEvent.getUser();
        if(Objects.isNull(user)) return;

        Message<byte[]> message = sessionConnectedEvent.getMessage();
        String sessionId = SimpMessageHeaderAccessor.getSessionId(message.getHeaders());
        sessionsRegistry.put(sessionId, user.getName());
        publish();
    }

    @EventListener
    public void disConnected(SessionDisconnectEvent sessionDisconnectEvent){
        String sessionId = sessionDisconnectEvent.getSessionId();
        String removedSessionId = sessionsRegistry.remove(sessionId);
        if(!Objects.isNull(removedSessionId)){
            publish();
        }
    }

    public void publish(){
        List<String> listUserConnecting = sessionsRegistry.values().stream().distinct().sorted().collect(Collectors.toList());
        template.convertAndSend("/topic/chat.users", listUserConnecting);
    }
}
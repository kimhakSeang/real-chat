package com.kimhak.niche.app.service.impl;

import com.kimhak.niche.app.dto.PersonalMessage;
import com.kimhak.niche.app.service.PrivateChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.security.Principal;
import java.time.LocalDateTime;

@Service
@Slf4j
@RequiredArgsConstructor
public class PrivateChatServiceImpl implements PrivateChatService {
    private final SimpMessagingTemplate template;

    public void sendPrivateMessage(PersonalMessage request, Principal principal) {

        // 1. Identify sender from authenticated connection
        String sender = principal.getName();

        // 2. Build message
        PersonalMessage message = PersonalMessage.builder()
                .from(sender)
                .to(request.getTo())
                .text(request.getText())
                .clientMessageId(request.getClientMessageId())
                .timestamp(LocalDateTime.now())
                .build();

        // 3. Save message into MongoDB
//        ChatMessage saved = repository.save(message);

        // 4. Send message to receiver
        try{
            template.convertAndSendToUser(
                    request.getTo(),
                    "/queue/private",
                    message
            );

            // 5. Send acknowledgment to sender
            template.convertAndSendToUser(
                    sender,
                    "/queue/private",
                    message
            );
        } catch (Exception e) {
            log.error("Sending failed: {}", e.getMessage(), e);
        }
    }
}

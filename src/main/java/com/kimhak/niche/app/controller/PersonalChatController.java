package com.kimhak.niche.app.controller;

import com.kimhak.niche.app.component.PresenceTracker;
import com.kimhak.niche.app.dto.PersonalMessage;
import com.kimhak.niche.app.vo.PersonalMessageVo;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Objects;

@Slf4j
@Controller
@RequiredArgsConstructor
public class PersonalChatController {
    private final PresenceTracker presenceTracker;
    private final SimpMessagingTemplate template;

    @MessageMapping("/chat.who")
    public void userRegister(){
        presenceTracker.publish();
    }

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(
            @Payload PersonalMessageVo request,
            Principal principal) {

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

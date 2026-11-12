package com.kimhak.niche.app.controller;

import com.kimhak.niche.app.component.PresenceTracker;
import com.kimhak.niche.app.dto.PersonalMessage;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.Objects;

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
    public void send(PersonalMessage message, Principal sender){
        if(Objects.isNull(sender) || Objects.isNull(message.getTo()) || Objects.isNull(message.getText())){
            return;
        }
        PersonalMessage messageParam = PersonalMessage.builder()
                .from(sender.getName())
                .to(message.getTo())
                .text(message.getText())
                .timestamp(LocalDateTime.now())
                .build();

        template.convertAndSendToUser(messageParam.getTo(), "/queue/private", messageParam);
        if(!messageParam.getTo().equals(messageParam.getFrom())){
            template.convertAndSendToUser(messageParam.getFrom(), "/queue/private", messageParam);
        }
    }


}

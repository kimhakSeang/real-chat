package com.vintage.app.controller;

import com.vintage.app.component.PresenceTracker;
import com.vintage.app.dto.PersonalMessage;
import com.vintage.app.service.PrivateChatService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class PersonalChatController {
    private final PresenceTracker presenceTracker;
    private final PrivateChatService privateChatService;

    @MessageMapping("/chat.who")
    public void userRegister(){
        presenceTracker.publish();
    }

    @MessageMapping("/chat.private")
    public void sendPrivateMessage(@Payload PersonalMessage request, Principal principal) {
        privateChatService.sendPrivateMessage(request, principal);
    }
}

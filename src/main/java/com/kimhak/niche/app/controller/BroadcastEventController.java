package com.kimhak.niche.app.controller;

import com.kimhak.niche.app.dto.EventMessage;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

@Controller
public class BroadcastEventController {

    @MessageMapping("/send-message")
    @SendTo("/event/messages")
    public EventMessage sendMessage(EventMessage message) {
        return message;
    }
}
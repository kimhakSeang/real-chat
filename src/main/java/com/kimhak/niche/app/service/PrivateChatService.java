package com.kimhak.niche.app.service;

import com.kimhak.niche.app.dto.PersonalMessage;

import java.security.Principal;

public interface PrivateChatService {
    void sendPrivateMessage(PersonalMessage request, Principal principal);
}

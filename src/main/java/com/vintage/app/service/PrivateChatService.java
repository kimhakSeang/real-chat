package com.vintage.app.service;

import com.vintage.app.dto.PersonalMessage;

import java.security.Principal;

public interface PrivateChatService {
    void sendPrivateMessage(PersonalMessage request, Principal principal);
}

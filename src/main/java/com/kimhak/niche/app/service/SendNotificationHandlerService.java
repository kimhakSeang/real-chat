package com.kimhak.niche.app.service;


import com.kimhak.niche.app.dto.User;

import java.util.List;

public interface SendNotificationHandlerService {
    void sendNotification(List<User> users);
}

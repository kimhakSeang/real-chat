package com.kimhak.niche.app.service.impl;

import com.kimhak.niche.app.dto.User;
import com.kimhak.niche.app.service.NotificationService;

public class SMSNotificationService implements NotificationService {
    @Override
    public void send(User user) {
        System.out.println("Send SMS Notification to "+ user.getName());
    }
}

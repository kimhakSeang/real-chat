package com.kimhak.niche.app.service.impl;


import com.kimhak.niche.app.dto.User;
import com.kimhak.niche.app.service.NotificationService;

public class EmailNotificationService implements NotificationService {
    @Override
    public void send(User user) {
        System.out.println("Send Email Notification to "+ user.getName());
    }
}

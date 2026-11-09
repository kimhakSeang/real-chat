package com.kimhak.niche.app.service.impl;


import com.kimhak.niche.app.dto.User;
import com.kimhak.niche.app.service.NotificationService;

public class TelegramNotificationService implements NotificationService {
    @Override
    public void send(User user) {
        System.out.println("Send Telegram Notification to "+ user.getName());
    }
}

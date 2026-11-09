package com.kimhak.niche.app.service;

import com.kimhak.niche.app.service.impl.EmailNotificationService;
import com.kimhak.niche.app.service.impl.SMSNotificationService;
import com.kimhak.niche.app.service.impl.TelegramNotificationService;

import java.util.HashMap;
import java.util.Map;

import static com.kimhak.niche.app.constant.ChannelNotificationConst.EMAIL;
import static com.kimhak.niche.app.constant.ChannelNotificationConst.SMS;
import static com.kimhak.niche.app.constant.ChannelNotificationConst.TELEGRAM;

public class NotificationFactory {
    private Map<String, NotificationService> notificationServiceMap;

    public NotificationFactory() {
        Map<String, NotificationService> notificationServiceMap = new HashMap<>();
        notificationServiceMap.put(EMAIL, new EmailNotificationService());
        notificationServiceMap.put(SMS, new SMSNotificationService());
        notificationServiceMap.put(TELEGRAM, new TelegramNotificationService());
        this.notificationServiceMap = notificationServiceMap;
    }

    public Map<String, NotificationService> getNotificationServiceMap() {
        return notificationServiceMap;
    }

    public void setNotificationServiceMap(Map<String, NotificationService> notificationServiceMap) {
        this.notificationServiceMap = notificationServiceMap;
    }
}

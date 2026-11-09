package com.kimhak.niche.app.service.impl;

import com.kimhak.niche.app.dto.Contact;
import com.kimhak.niche.app.dto.User;
import com.kimhak.niche.app.service.NotificationFactory;
import com.kimhak.niche.app.service.NotificationService;
import com.kimhak.niche.app.service.SendNotificationHandlerService;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

import static com.kimhak.niche.app.constant.ChannelNotificationConst.EMAIL;
import static com.kimhak.niche.app.constant.ChannelNotificationConst.SMS;
import static com.kimhak.niche.app.constant.ChannelNotificationConst.TELEGRAM;

public class SendNotificationHandlerServiceImpl implements SendNotificationHandlerService {

    private final ExecutorService executor = Executors.newVirtualThreadPerTaskExecutor();
    private final Map<String, NotificationService> notificationFactory = new NotificationFactory().getNotificationServiceMap();

    @Override
    public void sendNotification(List<User> users) {
        users.forEach( user -> {
            NotificationService notificationService;
            // Check User Channel
            Contact userContact = user.getContact();
            if (isNonNullAndNotEmpty(userContact.getPhoneNo())){
                notificationService = notificationFactory.get(SMS);
                System.out.println("Success send SMS Notification to "+ user.getName());
            }else if(isNonNullAndNotEmpty(userContact.getEmail())) {
                notificationService = notificationFactory.get(EMAIL);
                System.out.println("Success send EMAIL Notification to "+ user.getName());
            } else if (isNonNullAndNotEmpty(userContact.getTelegram())) {
                notificationService = notificationFactory.get(TELEGRAM);
                System.out.println("Success send TELEGRAM Notification to "+ user.getName());
            } else {
                System.out.println("Failed send Notification to "+ user.getName());
                return; //Skip because haven't channel to push, Other hand we can return error
            }
            executor.submit(()-> notificationService.send(user));
        });
        executor.shutdown();
    }

    private boolean isNonNullAndNotEmpty(String value){
        return Objects.nonNull(value) && !value.isEmpty();
    }
}

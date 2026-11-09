package com.kimhak.niche.app.dto;


public class Contact {
    private String phoneNo;
    private String email;
    private String telegram;

    public Contact() {
    }

    public Contact(String phoneNo, String email, String telegram) {
        this.phoneNo = phoneNo;
        this.email = email;
        this.telegram = telegram;
    }

    public String getPhoneNo() {
        return phoneNo;
    }

    public void setPhoneNo(String phoneNo) {
        this.phoneNo = phoneNo;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getTelegram() {
        return telegram;
    }

    public void setTelegram(String telegram) {
        this.telegram = telegram;
    }
}

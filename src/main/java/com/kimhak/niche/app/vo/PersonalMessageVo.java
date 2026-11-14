package com.kimhak.niche.app.vo;

import lombok.Data;

@Data
public class PersonalMessageVo {
    private String to;
    private String text;
    private String clientMessageId;
}
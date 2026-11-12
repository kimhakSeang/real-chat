package com.kimhak.niche.app.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PersonalMessage {
    private String from;
    private String to;
    private String text;
    private LocalDateTime timestamp;
}
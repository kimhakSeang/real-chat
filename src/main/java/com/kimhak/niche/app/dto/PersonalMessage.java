package com.kimhak.niche.app.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PersonalMessage {
    private String from;
    private String to;
    private String text;
    private String clientMessageId;
    private LocalDateTime timestamp;
}
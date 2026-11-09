package com.kimhak.niche.app.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class EventMessage {
    private String author;
    private String tittle;
    private String content;
    private String imageUrl;
    private LocalDateTime timestamp;
}
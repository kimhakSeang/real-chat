package com.kimhak.niche.app.controller;

import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
public class UploadController {
    private static final Path DIR = Paths.get("uploads").toAbsolutePath();
    private static final Map<String, String> EXT = Map.of(
        "image/jpeg", ".jpg", "image/png", ".png",
        "image/gif", ".gif", "image/webp", ".webp");

    @PostMapping("/upload")
    public Map<String, String> upload(@RequestParam("file") MultipartFile file) throws IOException {
        String ext = EXT.get(file.getContentType());
        if (ext == null) {
            throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only JPG, PNG, GIF or WebP");
        }
        Files.createDirectories(DIR);
        String name = UUID.randomUUID() + ext;      // never use the client's file name
        file.transferTo(DIR.resolve(name));
        return Map.of("url", "/uploads/" + name);
    }
}

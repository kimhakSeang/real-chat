package com.kimhak.niche.app.service.impl;

import com.kimhak.niche.app.service.UploadImageService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class UploadImageServiceImpl implements UploadImageService {
    private static final Path DIR = Paths.get("uploads").toAbsolutePath();
    private static final Map<String, String> EXT = Map.of(
        "image/jpeg", ".jpg", "image/png", ".png",
        "image/gif", ".gif", "image/webp", ".webp");

    public Map<String, String> upload(MultipartFile file) {
        try{
            String ext = EXT.get(file.getContentType());
            if (ext == null) {
                throw new ResponseStatusException(HttpStatus.UNSUPPORTED_MEDIA_TYPE, "Only JPG, PNG, GIF or WebP");
            }
            Files.createDirectories(DIR);
            String name = UUID.randomUUID() + ext;      // never use the client's file name
            file.transferTo(DIR.resolve(name));
            return Map.of("url", "/uploads/" + name);
        } catch (Exception e) {
            log.error("Error while upload image file: {}", file, e);
            return null;
        }
    }
}

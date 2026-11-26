package com.vintage.app.service;

import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

public interface UploadImageService {
    Map<String, String> upload(MultipartFile file);
}

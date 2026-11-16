package com.kimhak.niche.app.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

@Configuration
public class WebConfig implements WebMvcConfigurer {
    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(Paths.get("uploads").toAbsolutePath().toUri().toString());
    }
    @Override
    public void addCorsMappings(CorsRegistry registry) {   // only needed if pages are on another origin
        registry.addMapping("/api/**").allowedOriginPatterns("*");
        registry.addMapping("/uploads/**").allowedOriginPatterns("*");
    }
}
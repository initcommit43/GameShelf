package com.gameshelf.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Paths;

/**
 * Exposes the local uploads directory as a static resource path.
 * Files stored at {upload.dir}/avatars/foo.jpg are reachable at /uploads/avatars/foo.jpg.
 *
 * In production with S3 this class becomes a no-op — files are served directly from S3 URLs.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Value("${upload.dir:./uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(ResourceHandlerRegistry registry) {
        // Convert the relative path to an absolute file:// URI so Spring can locate it
        String absolutePath = Paths.get(uploadDir).toAbsolutePath().toUri().toString();

        registry.addResourceHandler("/uploads/**")
                .addResourceLocations(absolutePath);
    }
}

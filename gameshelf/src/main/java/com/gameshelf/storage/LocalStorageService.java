package com.gameshelf.storage;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

/**
 * Stores uploaded files on the local filesystem under {upload.dir}/avatars/.
 * Files are served as static resources at /uploads/avatars/{filename}.
 *
 * To migrate to S3:
 *   1. Implement S3StorageService with @Primary
 *   2. Remove @Primary here
 *   3. Add AWS SDK dependency + bucket config in application.properties
 */
@Primary
@Service
public class LocalStorageService implements StorageService {

    private final Path avatarDir;
    private final String baseUrl;

    public LocalStorageService(
            @Value("${upload.dir:./uploads}") String uploadDir,
            @Value("${upload.base-url:http://localhost:8080}") String baseUrl) {

        this.avatarDir = Paths.get(uploadDir, "avatars");
        this.baseUrl = baseUrl;

        // Create the directory on startup so the first upload never fails
        try {
            Files.createDirectories(this.avatarDir);
        } catch (IOException e) {
            throw new RuntimeException("Failed to create upload directory: " + avatarDir, e);
        }
    }

    @Override
    public String store(byte[] imageData, String filename) {
        Path target = avatarDir.resolve(filename);
        try {
            Files.write(target, imageData);
        } catch (IOException e) {
            throw new RuntimeException("Failed to write file: " + filename, e);
        }
        // Return the public URL; WebConfig maps /uploads/** to this directory
        return baseUrl + "/uploads/avatars/" + filename;
    }

    @Override
    public void delete(String filename) {
        try {
            Files.deleteIfExists(avatarDir.resolve(filename));
        } catch (IOException e) {
            // Log-worthy but not fatal — old file removal failing should not break the upload
            System.err.println("Warning: could not delete old avatar file: " + filename);
        }
    }
}

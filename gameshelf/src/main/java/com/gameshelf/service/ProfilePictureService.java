package com.gameshelf.service;

import com.gameshelf.model.User;
import com.gameshelf.repository.UserRepository;
import com.gameshelf.storage.StorageService;
import com.gameshelf.util.ImageProcessingUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProfilePictureService {

    // Accepted MIME types — WebP is handled by the TwelveMonkeys ImageIO plugin
    private static final Set<String> ALLOWED_TYPES = Set.of(
            "image/jpeg", "image/png", "image/webp"
    );

    // 3 MB hard limit (multipart config also enforces this at the request level)
    private static final long MAX_BYTES = 3L * 1024 * 1024;

    private final UserRepository userRepository;
    private final StorageService storageService;

    /**
     * Validates, processes, and stores a new profile picture for the given user.
     * Deletes the old avatar file from storage if one exists.
     *
     * @return the public URL of the newly stored avatar
     */
    public String uploadProfilePicture(String username, MultipartFile file) throws IOException {
        // ── 1. Validate ─────────────────────────────────────────────────────────
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("No file provided");
        }
        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new IllegalArgumentException("Only JPG, PNG, and WebP images are accepted");
        }
        if (file.getSize() > MAX_BYTES) {
            throw new IllegalArgumentException("File size must be 3 MB or less");
        }

        // ── 2. Process — center-crop → 256×256 → JPEG 85% ───────────────────────
        byte[] processed = ImageProcessingUtil.processProfileImage(file.getBytes());

        // ── 3. Build a unique filename so browsers never serve a stale cached version
        String filename = UUID.randomUUID() + ".jpg";

        // ── 4. Remove the previous avatar file (best-effort; storage impl ignores missing)
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username));

        String oldUrl = user.getProfilePictureUrl();
        if (oldUrl != null && !oldUrl.isBlank()) {
            // Extract just the filename from the full URL
            String oldFilename = oldUrl.substring(oldUrl.lastIndexOf('/') + 1);
            storageService.delete(oldFilename);
        }

        // ── 5. Store the processed bytes and persist the URL ────────────────────
        String publicUrl = storageService.store(processed, filename);
        user.setProfilePictureUrl(publicUrl);
        userRepository.save(user);

        return publicUrl;
    }

    /**
     * Returns the current profile picture URL for the user, or null if none is set.
     */
    public String getProfilePictureUrl(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found: " + username))
                .getProfilePictureUrl();
    }
}

package com.gameshelf.service;

import com.gameshelf.exception.NotFoundException;
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

        // Read bytes once so magic-byte check and processing share the same buffer
        byte[] raw = file.getBytes();
        if (!hasValidMagicBytes(raw)) {
            throw new IllegalArgumentException("File content does not match a supported image format");
        }

        // ── 2. Process — center-crop → 256×256 → JPEG 85% ───────────────────────
        byte[] processed = ImageProcessingUtil.processProfileImage(raw);

        // ── 3. Build a unique filename so browsers never serve a stale cached version
        String filename = UUID.randomUUID() + ".jpg";

        // ── 4. Remove the previous avatar file (best-effort; storage impl ignores missing)
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

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

    // Checks the leading bytes of the file against known image magic numbers.
    // JPEG: FF D8 FF
    // PNG:  89 50 4E 47 0D 0A 1A 0A
    // WebP: "RIFF" at 0–3 + "WEBP" at 8–11
    private boolean hasValidMagicBytes(byte[] bytes) {
        if (bytes == null || bytes.length < 12) return false;

        // JPEG
        if ((bytes[0] & 0xFF) == 0xFF &&
            (bytes[1] & 0xFF) == 0xD8 &&
            (bytes[2] & 0xFF) == 0xFF) return true;

        // PNG
        if ((bytes[0] & 0xFF) == 0x89 &&
            bytes[1] == 'P' && bytes[2] == 'N' && bytes[3] == 'G' &&
            bytes[4] == '\r' && bytes[5] == '\n' &&
            (bytes[6] & 0xFF) == 0x1A && bytes[7] == '\n') return true;

        // WebP
        if (bytes[0] == 'R' && bytes[1] == 'I' && bytes[2] == 'F' && bytes[3] == 'F' &&
            bytes[8] == 'W' && bytes[9] == 'E' && bytes[10] == 'B' && bytes[11] == 'P') return true;

        return false;
    }

    /**
     * Returns the current profile picture URL for the user, or null if none is set.
     */
    public String getProfilePictureUrl(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"))
                .getProfilePictureUrl();
    }
}

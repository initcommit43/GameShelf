package com.gameshelf.controller;

import com.gameshelf.dto.UserProfileResponse;
import com.gameshelf.service.ProfilePictureService;
import com.gameshelf.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class ProfileController {

    private final ProfilePictureService profilePictureService;
    private final UserService userService;

    /**
     * GET /api/profile/me
     * Returns the authenticated user's profile data (username + avatar URL).
     */
    @GetMapping("/me")
    public ResponseEntity<Map<String, Object>> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {

        String pictureUrl = profilePictureService.getProfilePictureUrl(userDetails.getUsername());
        return ResponseEntity.ok(Map.of(
                "username", userDetails.getUsername(),
                "profilePictureUrl", pictureUrl != null ? pictureUrl : ""
        ));
    }

    /**
     * GET /api/profile/full
     * Returns full profile data: stats + three game lists.
     */
    @GetMapping("/full")
    public ResponseEntity<UserProfileResponse> getFullProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(userService.getProfile(userDetails.getUsername()));
    }

    /**
     * POST /api/profile/picture  (multipart/form-data, field name: "file")
     * Validates, processes, and stores a new profile picture.
     * Returns the public URL of the stored avatar.
     */
    @PostMapping(value = "/picture", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadProfilePicture(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("file") MultipartFile file) throws IOException {

        String url = profilePictureService.uploadProfilePicture(userDetails.getUsername(), file);
        return ResponseEntity.ok(Map.of("profilePictureUrl", url));
    }
}

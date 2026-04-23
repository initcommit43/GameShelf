package com.gameshelf.controller;

import com.gameshelf.dto.ReviewRequest;
import com.gameshelf.dto.ReviewResponse;
import com.gameshelf.service.ReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ReviewController {

    private final ReviewService reviewService;

    @PostMapping("/api/games/{igdbId}/review")
    public ResponseEntity<ReviewResponse> createOrUpdate(
            Principal principal,
            @PathVariable Integer igdbId,
            @Valid @RequestBody ReviewRequest request) {
        return ResponseEntity.ok(reviewService.createOrUpdate(principal.getName(), igdbId, request));
    }

    @GetMapping("/api/games/{igdbId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getGameReviews(
            Principal principal,
            @PathVariable Integer igdbId,
            @RequestParam(defaultValue = "newest") String sort) {
        String currentUser = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(reviewService.getGameReviews(igdbId, sort, currentUser));
    }

    @DeleteMapping("/api/reviews/{id}")
    public ResponseEntity<Void> deleteReview(Principal principal, @PathVariable Long id) {
        reviewService.deleteReview(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/api/users/{userId}/reviews")
    public ResponseEntity<List<ReviewResponse>> getUserReviews(
            Principal principal,
            @PathVariable Long userId) {
        String currentUser = principal != null ? principal.getName() : null;
        return ResponseEntity.ok(reviewService.getUserReviews(userId, currentUser));
    }
}

package com.gameshelf.controller;

import com.gameshelf.dto.StatsResponse;
import com.gameshelf.repository.GameLogRepository;
import com.gameshelf.repository.ReviewRepository;
import com.gameshelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class StatsController {

    private final UserRepository userRepository;
    private final GameLogRepository gameLogRepository;
    private final ReviewRepository reviewRepository;

    @GetMapping("/api/stats")
    public ResponseEntity<StatsResponse> getStats() {
        return ResponseEntity.ok(new StatsResponse(
                userRepository.count(),
                gameLogRepository.count(),
                reviewRepository.count()
        ));
    }
}

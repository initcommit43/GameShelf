package com.gameshelf.controller;

import com.gameshelf.dto.GameLogRequest;
import com.gameshelf.dto.GameLogResponse;
import com.gameshelf.dto.ShelfCheckResponse;
import com.gameshelf.service.GameLogService;
import com.gameshelf.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/logs")
@RequiredArgsConstructor
public class GameLogController {

    private final GameLogService gameLogService;
    private final RecommendationService recommendationService;

    @GetMapping
    public ResponseEntity<List<GameLogResponse>> getUserLogs(Principal principal) {
        return ResponseEntity.ok(gameLogService.getUserLogs(principal.getName()));
    }

    @GetMapping("/check")
    public ResponseEntity<ShelfCheckResponse> checkLog(Principal principal, @RequestParam Integer igdbId) {
        return ResponseEntity.ok(gameLogService.checkLog(principal.getName(), igdbId));
    }

    @PostMapping
    public ResponseEntity<GameLogResponse> addLog(Principal principal, @Valid @RequestBody GameLogRequest request) {
        GameLogResponse response = gameLogService.addLog(principal.getName(), request);
        recommendationService.invalidateCache(principal.getName());
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<GameLogResponse> updateLog(Principal principal, @PathVariable Long id, @Valid @RequestBody GameLogRequest request) {
        return ResponseEntity.ok(gameLogService.updateLog(principal.getName(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLog(Principal principal, @PathVariable Long id) {
        gameLogService.deleteLog(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
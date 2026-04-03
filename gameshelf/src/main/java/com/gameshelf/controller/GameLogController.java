package com.gameshelf.controller;

import com.gameshelf.dto.GameLogRequest;
import com.gameshelf.dto.GameLogResponse;
import com.gameshelf.service.GameLogService;
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

    @GetMapping
    public ResponseEntity<List<GameLogResponse>> getUserLogs(Principal principal) {
        return ResponseEntity.ok(gameLogService.getUserLogs(principal.getName()));
    }

    @PostMapping
    public ResponseEntity<GameLogResponse> addLog(Principal principal, @RequestBody GameLogRequest request) {
        return ResponseEntity.ok(gameLogService.addLog(principal.getName(), request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GameLogResponse> updateLog(Principal principal, @PathVariable Long id, @RequestBody GameLogRequest request) {
        return ResponseEntity.ok(gameLogService.updateLog(principal.getName(), id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteLog(Principal principal, @PathVariable Long id) {
        gameLogService.deleteLog(principal.getName(), id);
        return ResponseEntity.noContent().build();
    }
}
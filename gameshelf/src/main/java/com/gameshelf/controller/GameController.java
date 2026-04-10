package com.gameshelf.controller;

import com.gameshelf.dto.GameDetailResponse;
import com.gameshelf.dto.GameResponse;
import com.gameshelf.service.GameService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    @GetMapping("/search")
    public ResponseEntity<List<GameResponse>> searchGames(@RequestParam String query) {
        return ResponseEntity.ok(gameService.searchGames(query));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<GameResponse>> getTrendingGames() {
        return ResponseEntity.ok(gameService.getTrendingGames());
    }

    @GetMapping("/browse")
    public ResponseEntity<List<GameResponse>> browseGames(
            @RequestParam(defaultValue = "rating") String sort,
            @RequestParam(defaultValue = "0") int offset) {
        return ResponseEntity.ok(gameService.browseGames(sort, offset));
    }

    @GetMapping("/{igdbId}")
    public ResponseEntity<GameDetailResponse> getGameDetails(@PathVariable Integer igdbId) {
        GameDetailResponse response = gameService.getGameDetails(igdbId);
        if (response == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(response);
    }
}
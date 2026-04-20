package com.gameshelf.controller;

import com.gameshelf.dto.GameDetailResponse;
import com.gameshelf.dto.GamePriceResponse;
import com.gameshelf.dto.GameResponse;
import com.gameshelf.dto.RecommendationResponse;
import com.gameshelf.service.GameService;
import com.gameshelf.service.PriceService;
import com.gameshelf.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;

@RestController
@RequestMapping("/api/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;
    private final RecommendationService recommendationService;
    private final PriceService priceService;

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
            @RequestParam(defaultValue = "0")      int offset,
            @RequestParam(required = false)        Integer genreId,
            @RequestParam(required = false)        Integer platformId,
            @RequestParam(required = false)        Integer minRating,
            @RequestParam(required = false)        Integer yearFrom,
            @RequestParam(required = false)        Integer yearTo) {
        return ResponseEntity.ok(gameService.browseGames(sort, offset, genreId, platformId, minRating, yearFrom, yearTo));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<List<RecommendationResponse>> getRecommendations(Principal principal) {
        return ResponseEntity.ok(recommendationService.getRecommendations(principal.getName()));
    }

    @GetMapping("/{igdbId}")
    public ResponseEntity<GameDetailResponse> getGameDetails(@PathVariable Integer igdbId) {
        GameDetailResponse response = gameService.getGameDetails(igdbId);
        if (response == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{igdbId}/prices")
    public ResponseEntity<GamePriceResponse> getGamePrices(@PathVariable Integer igdbId) {
        GameDetailResponse game = gameService.getGameDetails(igdbId);
        if (game == null) return ResponseEntity.notFound().build();
        Integer steamAppId = gameService.getSteamAppId(igdbId);
        return ResponseEntity.ok(priceService.getPrices(igdbId, game.getTitle(), steamAppId));
    }
}
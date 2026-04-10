package com.gameshelf.service;

import com.gameshelf.dto.GameDetailResponse;
import com.gameshelf.dto.GameResponse;
import com.gameshelf.model.Game;
import com.gameshelf.repository.GameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Arrays;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;

    @Value("${igdb.client-id}")
    private String clientId;

    @Value("${igdb.access-token}")
    private String accessToken;

    private RestClient igdbClient;

    @jakarta.annotation.PostConstruct
    public void init() {
        igdbClient = RestClient.builder()
                .baseUrl("https://api.igdb.com/v4")
                .defaultHeader("Client-ID", clientId)
                .defaultHeader("Authorization", "Bearer " + accessToken)
                .defaultHeader("Content-Type", "text/plain")
                .build();
    }

    public List<GameResponse> searchGames(String query) {
        String body = "search \"" + query + "\"; fields id,name,cover.url; limit 10;";

        IgdbGame[] results = igdbClient
                .post()
                .uri("/games")
                .body(body)
                .retrieve()
                .body(IgdbGame[].class);

        if (results == null) return List.of();

        return Arrays.stream(results)
                .map(this::toGameResponse)
                .toList();
    }

    public List<GameResponse> getTrendingGames() {
        // Step 1: fetch trending game IDs ordered by visit count
        String popularityBody = "fields game_id; sort value desc; where popularity_type = 1; limit 12;";

        IgdbPopularity[] popularityResults = igdbClient
                .post()
                .uri("/popularity_primitives")
                .body(popularityBody)
                .retrieve()
                .body(IgdbPopularity[].class);

        if (popularityResults == null || popularityResults.length == 0) return List.of();

        // Build an id → rank map so we can restore popularity order later
        Map<Integer, Integer> rankMap = new HashMap<>();
        StringBuilder ids = new StringBuilder();
        for (int i = 0; i < popularityResults.length; i++) {
            rankMap.put(popularityResults[i].game_id, i);
            if (i > 0) ids.append(",");
            ids.append(popularityResults[i].game_id);
        }

        // Step 2: fetch game details for those IDs
        String gamesBody = "fields id,name,cover.url; where id = (" + ids + ") & cover != null; limit 12;";

        IgdbGame[] games = igdbClient
                .post()
                .uri("/games")
                .body(gamesBody)
                .retrieve()
                .body(IgdbGame[].class);

        if (games == null) return List.of();

        return Arrays.stream(games)
                .sorted(Comparator.comparingInt(g -> rankMap.getOrDefault(g.id, Integer.MAX_VALUE)))
                .map(this::toGameResponse)
                .toList();
    }

    public List<GameResponse> browseGames(String sort, int offset) {
        String validSort = List.of("rating", "hypes", "first_release_date").contains(sort) ? sort : "rating";
        String body = String.format(
                "fields id,name,cover.url,rating; where cover != null & rating != null & rating > 60; sort %s desc; limit 24; offset %d;",
                validSort, offset);

        IgdbGame[] results = igdbClient
                .post()
                .uri("/games")
                .body(body)
                .retrieve()
                .body(IgdbGame[].class);

        if (results == null) return List.of();

        return Arrays.stream(results)
                .map(this::toGameResponse)
                .toList();
    }

    public GameDetailResponse getGameDetails(Integer igdbId) {
        String body = "fields id,name,cover.url,summary,rating,genres.name,first_release_date,platforms.name; where id = " + igdbId + ";";

        IgdbGame[] results = igdbClient
                .post()
                .uri("/games")
                .body(body)
                .retrieve()
                .body(IgdbGame[].class);

        if (results == null || results.length == 0) return null;

        IgdbGame game = results[0];
        String coverUrl = game.cover != null
                ? "https:" + game.cover.url.replace("t_thumb", "t_cover_big")
                : null;

        List<String> genres = game.genres != null
                ? Arrays.stream(game.genres).map(g -> g.name).toList()
                : List.of();

        List<String> platforms = game.platforms != null
                ? Arrays.stream(game.platforms).map(p -> p.name).toList()
                : List.of();

        String releaseYear = game.first_release_date != null
                ? String.valueOf(Instant.ofEpochSecond(game.first_release_date)
                    .atZone(ZoneOffset.UTC)
                    .getYear())
                : null;

        return new GameDetailResponse(igdbId, game.name, coverUrl, game.summary,
                game.rating, genres, releaseYear, platforms);
    }

    public GameResponse getOrSaveGame(Integer igdbId, String title, String coverUrl) {
        Game game = gameRepository.findByIgdbId(igdbId).orElseGet(() -> {
            Game newGame = Game.builder()
                    .igdbId(igdbId)
                    .title(title)
                    .coverUrl(coverUrl)
                    .build();
            return gameRepository.save(newGame);
        });

        return new GameResponse(game.getId(), game.getIgdbId(), game.getTitle(), game.getCoverUrl());
    }

    private GameResponse toGameResponse(IgdbGame igdbGame) {
        String coverUrl = igdbGame.cover != null
                ? "https:" + igdbGame.cover.url.replace("t_thumb", "t_cover_big")
                : null;
        return new GameResponse(null, igdbGame.id, igdbGame.name, coverUrl);
    }

    private static class IgdbGame {
        public Integer id;
        public String name;
        public IgdbCover cover;
        public String summary;
        public Double rating;
        public IgdbGenre[] genres;
        public Long first_release_date;
        public IgdbPlatform[] platforms;
    }

    private static class IgdbCover {
        public String url;
    }

    private static class IgdbGenre {
        public String name;
    }

    private static class IgdbPlatform {
        public String name;
    }

    private static class IgdbPopularity {
        public Integer game_id;
    }
}
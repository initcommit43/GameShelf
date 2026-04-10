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
import java.util.stream.Collectors;

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
        // Fetch 40 candidates so the rating_count filter below has room to cut junk without
        // emptying the list — after filtering we take the top 12.
        String popularityBody = "fields game_id; sort value desc; where popularity_type = 1; limit 40;";

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

        // rating_count > 50 for trending — these are currently popular games, not all-time greats,
        // so the bar is intentionally lower. It still cuts one-off viral jokes with no real player base.
        // limit matches the fetch size (40) so IGDB doesn't cut results before our Java sort+trim.
        String gamesBody = "fields id,name,cover.url; where id = (" + ids + ") & cover != null & rating_count > 50; limit 40;";

        IgdbGame[] games = igdbClient
                .post()
                .uri("/games")
                .body(gamesBody)
                .retrieve()
                .body(IgdbGame[].class);

        if (games == null) return List.of();

        return Arrays.stream(games)
                .sorted(Comparator.comparingInt(g -> rankMap.getOrDefault(g.id, Integer.MAX_VALUE)))
                .limit(12)
                .map(this::toGameResponse)
                .toList();
    }

    public List<GameResponse> browseGames(String sort, int offset) {
        String validSort = List.of("rating", "hypes", "first_release_date").contains(sort) ? sort : "rating";
        // rating_count > 500 keeps the score statistically meaningful while preserving notable
        // indie games (Hades ~3k, Disco Elysium ~2k). Category is intentionally omitted —
        // many legitimate IGDB entries have category unset, so a whitelist silently drops them.
        String body = String.format(
                "fields id,name,cover.url,rating; where cover != null & rating != null & rating > 75 & rating_count > 500; sort %s desc; limit 24; offset %d;",
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

    public Map<Integer, GameDetailResponse> getGameDetailsBatch(List<Integer> igdbIds) {
        if (igdbIds.isEmpty()) return Map.of();
        String ids = igdbIds.stream().map(String::valueOf).collect(Collectors.joining(","));
        String body = "fields id,rating,first_release_date; where id = (" + ids + "); limit " + igdbIds.size() + ";";

        IgdbGame[] results = igdbClient.post().uri("/games").body(body).retrieve().body(IgdbGame[].class);
        if (results == null) return Map.of();

        Map<Integer, GameDetailResponse> map = new HashMap<>();
        for (IgdbGame g : results) {
            String releaseYear = g.first_release_date != null
                    ? String.valueOf(Instant.ofEpochSecond(g.first_release_date).atZone(ZoneOffset.UTC).getYear())
                    : null;
            map.put(g.id, new GameDetailResponse(g.id, null, null, null, g.rating, List.of(), releaseYear, List.of()));
        }
        return map;
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
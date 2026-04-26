package com.gameshelf.service;

import com.gameshelf.dto.GameDetailResponse;
import com.gameshelf.dto.GameLogRequest;
import com.gameshelf.dto.GameLogResponse;
import com.gameshelf.dto.ShelfCheckResponse;
import com.gameshelf.exception.ConflictException;
import com.gameshelf.exception.ForbiddenException;
import com.gameshelf.exception.NotFoundException;
import com.gameshelf.model.Game;
import com.gameshelf.model.GameLog;
import com.gameshelf.model.User;
import com.gameshelf.repository.GameLogRepository;
import com.gameshelf.repository.GameRepository;
import com.gameshelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameLogService {

    private final GameLogRepository gameLogRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;
    private final GameService gameService;

    @Transactional(readOnly = true)
    public ShelfCheckResponse checkLog(String username, Integer igdbId) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));
        return gameLogRepository.findByUserIdAndIgdbId(user.getId(), igdbId)
                .map(log -> new ShelfCheckResponse(true, log.getStatus(), log.getRating()))
                .orElse(new ShelfCheckResponse(false, null, null));
    }

    @Transactional
    public GameLogResponse addLog(String username, GameLogRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Game game;
        if (request.getIgdbId() != null) {
            game = gameRepository.findByIgdbId(request.getIgdbId()).orElseGet(() -> {
                Game newGame = Game.builder()
                        .igdbId(request.getIgdbId())
                        .title(request.getTitle())
                        .coverUrl(request.getCoverUrl())
                        .releaseYear(request.getReleaseYear())
                        .igdbRating(request.getIgdbRating())
                        .build();
                return gameRepository.save(newGame);
            });
        } else {
            game = gameRepository.findById(request.getGameId())
                    .orElseThrow(() -> new NotFoundException("Game not found"));
        }

        if (gameLogRepository.existsByUserIdAndGameId(user.getId(), game.getId())) {
            throw new ConflictException("Game already logged");
        }

        GameLog log = GameLog.builder()
                .user(user)
                .game(game)
                .status(request.getStatus())
                .rating(request.getRating())
                .build();

        gameLogRepository.save(log);

        return toResponse(log);
    }

    @Transactional
    public GameLogResponse updateLog(String username, Long logId, GameLogRequest request) {
        GameLog log = gameLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("Log not found"));

        if (!log.getUser().getUsername().equals(username)) {
            throw new ForbiddenException("Unauthorized");
        }

        log.setStatus(request.getStatus());
        log.setRating(request.getRating());
        gameLogRepository.save(log);

        return toResponse(log);
    }

    @Transactional
    public void deleteLog(String username, Long logId) {
        GameLog log = gameLogRepository.findById(logId)
                .orElseThrow(() -> new NotFoundException("Log not found"));

        if (!log.getUser().getUsername().equals(username)) {
            throw new ForbiddenException("Unauthorized");
        }

        gameLogRepository.delete(log);
    }

    @Transactional
    public List<GameLogResponse> getUserLogs(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        List<GameLog> logs = gameLogRepository.findByUserId(user.getId());

        // Backfill any games that were added before we stored releaseYear/igdbRating locally.
        List<Game> missing = logs.stream()
                .map(GameLog::getGame)
                .filter(g -> g.getIgdbId() != null && (g.getReleaseYear() == null || g.getIgdbRating() == null))
                .distinct()
                .collect(Collectors.toList());

        if (!missing.isEmpty()) {
            try {
                List<Integer> ids = missing.stream().map(Game::getIgdbId).collect(Collectors.toList());
                Map<Integer, GameDetailResponse> details = gameService.getGameDetailsBatch(ids);
                for (Game game : missing) {
                    GameDetailResponse d = details.get(game.getIgdbId());
                    if (d != null) {
                        game.setReleaseYear(d.getReleaseYear());
                        game.setIgdbRating(d.getRating());
                        gameRepository.save(game);
                    }
                }
            } catch (Exception ignored) {}
        }

        return logs.stream().map(this::toResponse).toList();
    }

    private GameLogResponse toResponse(GameLog log) {
        return new GameLogResponse(
                log.getId(),
                log.getGame().getId(),
                log.getGame().getIgdbId(),
                log.getGame().getTitle(),
                log.getGame().getCoverUrl(),
                log.getStatus(),
                log.getRating(),
                log.getCreatedAt(),
                log.getGame().getReleaseYear(),
                log.getGame().getIgdbRating()
        );
    }
}
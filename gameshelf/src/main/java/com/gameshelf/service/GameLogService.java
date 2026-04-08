package com.gameshelf.service;

import com.gameshelf.dto.GameLogRequest;
import com.gameshelf.dto.GameLogResponse;
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

@Service
@RequiredArgsConstructor
public class GameLogService {

    private final GameLogRepository gameLogRepository;
    private final GameRepository gameRepository;
    private final UserRepository userRepository;

    public GameLogResponse addLog(String username, GameLogRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Game game;
        if (request.getIgdbId() != null) {
            game = gameRepository.findByIgdbId(request.getIgdbId()).orElseGet(() -> {
                Game newGame = Game.builder()
                        .igdbId(request.getIgdbId())
                        .title(request.getTitle())
                        .coverUrl(request.getCoverUrl())
                        .build();
                return gameRepository.save(newGame);
            });
        } else {
            game = gameRepository.findById(request.getGameId())
                    .orElseThrow(() -> new RuntimeException("Game not found"));
        }

        if (gameLogRepository.existsByUserIdAndGameId(user.getId(), game.getId())) {
            throw new RuntimeException("Game already logged");
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

    public GameLogResponse updateLog(String username, Long logId, GameLogRequest request) {
        GameLog log = gameLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Log not found"));

        if (!log.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }

        log.setStatus(request.getStatus());
        log.setRating(request.getRating());
        gameLogRepository.save(log);

        return toResponse(log);
    }

    public void deleteLog(String username, Long logId) {
        GameLog log = gameLogRepository.findById(logId)
                .orElseThrow(() -> new RuntimeException("Log not found"));

        if (!log.getUser().getUsername().equals(username)) {
            throw new RuntimeException("Unauthorized");
        }

        gameLogRepository.delete(log);
    }

    @Transactional(readOnly = true)
    public List<GameLogResponse> getUserLogs(String username) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found"));

        return gameLogRepository.findByUserId(user.getId())
                .stream()
                .map(this::toResponse)
                .toList();
    }

    private GameLogResponse toResponse(GameLog log) {
        return new GameLogResponse(
                log.getId(),
                log.getGame().getId(),
                log.getGame().getTitle(),
                log.getGame().getCoverUrl(),
                log.getStatus(),
                log.getRating()
        );
    }
}
package com.gameshelf.service;

import com.gameshelf.dto.ReviewRequest;
import com.gameshelf.dto.ReviewResponse;
import com.gameshelf.exception.ForbiddenException;
import com.gameshelf.exception.NotFoundException;
import com.gameshelf.model.Game;
import com.gameshelf.model.Review;
import com.gameshelf.model.User;
import com.gameshelf.repository.GameLogRepository;
import com.gameshelf.repository.GameRepository;
import com.gameshelf.repository.ReviewRepository;
import com.gameshelf.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final UserRepository userRepository;
    private final GameRepository gameRepository;
    private final GameLogRepository gameLogRepository;

    @Transactional
    public ReviewResponse createOrUpdate(String username, Integer igdbId, ReviewRequest request) {
        User user = userRepository.findByUsername(username)
                .orElseThrow(() -> new NotFoundException("User not found"));

        Game game = gameRepository.findByIgdbId(igdbId)
                .orElseThrow(() -> new NotFoundException("Add this game to your shelf before reviewing it."));

        if (!gameLogRepository.existsByUserIdAndGameId(user.getId(), game.getId())) {
            throw new ForbiddenException("Add this game to your shelf before reviewing it.");
        }

        Optional<Review> existing = reviewRepository.findByUserIdAndGameId(user.getId(), game.getId());

        Review review;
        if (existing.isPresent()) {
            review = existing.get();
            review.setRating(request.getRating());
            review.setReviewText(request.getReviewText() != null ? request.getReviewText().trim() : null);
            review.setSpoiler(request.isSpoiler());
        } else {
            review = Review.builder()
                    .user(user)
                    .game(game)
                    .rating(request.getRating())
                    .reviewText(request.getReviewText() != null ? request.getReviewText().trim() : null)
                    .spoiler(request.isSpoiler())
                    .build();
        }

        reviewRepository.save(review);
        return toResponse(review, username);
    }

    public List<ReviewResponse> getGameReviews(Integer igdbId, String sort, String currentUsername) {
        Optional<Game> gameOpt = gameRepository.findByIgdbId(igdbId);
        if (gameOpt.isEmpty()) return List.of();

        Long gameId = gameOpt.get().getId();
        List<Review> reviews = switch (sort) {
            case "highest_rating" -> reviewRepository.findByGameIdHighestRated(gameId);
            case "lowest_rating"  -> reviewRepository.findByGameIdLowestRated(gameId);
            default               -> reviewRepository.findByGameIdNewest(gameId);
        };

        return reviews.stream().map(r -> toResponse(r, currentUsername)).toList();
    }

    @Transactional
    public void deleteReview(String username, Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new NotFoundException("Review not found"));

        if (!review.getUser().getUsername().equals(username)) {
            throw new ForbiddenException("You can only delete your own reviews.");
        }

        reviewRepository.delete(review);
    }

    public List<ReviewResponse> getUserReviews(Long userId, String currentUsername) {
        return reviewRepository.findByUserIdWithGame(userId).stream()
                .map(r -> toResponse(r, currentUsername))
                .toList();
    }

    private ReviewResponse toResponse(Review r, String currentUsername) {
        boolean mine = currentUsername != null && r.getUser().getUsername().equals(currentUsername);
        String text = (r.getReviewText() != null && !r.getReviewText().isBlank()) ? r.getReviewText() : null;
        return new ReviewResponse(
                r.getId(),
                r.getUser().getUsername(),
                r.getRating(),
                text,
                r.getSpoiler() != null && r.getSpoiler(),
                mine,
                r.getCreatedAt(),
                r.getUpdatedAt()
        );
    }
}

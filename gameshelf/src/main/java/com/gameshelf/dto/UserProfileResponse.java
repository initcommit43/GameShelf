package com.gameshelf.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.util.List;

@Getter
@AllArgsConstructor
public class UserProfileResponse {
    private String username;
    private String profilePictureUrl;
    private String joinedAt;
    private int totalGames;
    private int completedGames;
    private int playingGames;
    private String averageRating;
    private String mostPlayedGenre;
    private List<GameLogSummary> recentlyPlayed;
    private List<GameLogSummary> topRated;
    private List<GameLogSummary> currentlyPlaying;
}

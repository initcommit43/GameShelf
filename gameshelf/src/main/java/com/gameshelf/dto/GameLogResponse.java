package com.gameshelf.dto;

import com.gameshelf.model.GameStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameLogResponse {
    private Long id;
    private Long gameId;
    private Integer igdbId;
    private String gameTitle;
    private String coverUrl;
    private GameStatus status;
    private Integer rating;
}
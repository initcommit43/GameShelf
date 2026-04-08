package com.gameshelf.dto;

import com.gameshelf.model.GameStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameLogRequest {
    private Long gameId;
    private Integer igdbId;
    private String title;
    private String coverUrl;
    private GameStatus status;
    private Integer rating;
}
package com.gameshelf.dto;

import com.gameshelf.model.GameStatus;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameLogRequest {
    private Long gameId;
    private GameStatus status;
    private Integer rating;
}
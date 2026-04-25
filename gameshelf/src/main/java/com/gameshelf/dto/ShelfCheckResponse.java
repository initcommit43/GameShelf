package com.gameshelf.dto;

import com.gameshelf.model.GameStatus;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class ShelfCheckResponse {
    private boolean onShelf;
    private GameStatus status;
    private Integer rating;
}

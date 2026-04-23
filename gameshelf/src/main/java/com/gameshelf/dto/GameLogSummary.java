package com.gameshelf.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class GameLogSummary {
    private Long logId;
    private Integer igdbId;
    private String title;
    private String coverUrl;
    private String status;
    private Integer rating;
}

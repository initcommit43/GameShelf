package com.gameshelf.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RecommendationResponse {
    private Integer igdbId;
    private String title;
    private String coverUrl;
    private String summary;
    private Double igdbRating;
    private int score;
    private int confidencePct;
    private List<String> reasons;
}

package com.gameshelf.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameDetailResponse {
    private Integer igdbId;
    private String title;
    private String coverUrl;
    private String summary;
    private Double rating;
    private List<String> genres;
    private String releaseYear;
    private List<String> platforms;
}

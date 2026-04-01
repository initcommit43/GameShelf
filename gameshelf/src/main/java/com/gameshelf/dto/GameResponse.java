package com.gameshelf.dto;

import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameResponse {
    private Long id;
    private Integer igdbId;
    private String title;
    private String coverUrl;
}
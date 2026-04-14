package com.gameshelf.dto;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class IgdbEnrichment {

    private int igdbId;
    private String title;
    private String coverUrl;
    private String summary;
    private List<Tag> genres;
    private List<Tag> themes;
    private List<Tag> keywords;
    private List<Integer> similarGames;

    @Getter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Tag {
        private int id;
        private String name;
    }
}

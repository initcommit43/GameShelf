package com.gameshelf.dto;

import com.gameshelf.model.GameStatus;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class GameLogRequest {

    private Long gameId;
    private Integer igdbId;

    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @Size(max = 512, message = "Cover URL must not exceed 512 characters")
    private String coverUrl;

    @Size(max = 4, message = "Release year must be a 4-character value")
    private String releaseYear;

    @DecimalMin(value = "0.0", message = "IGDB rating must be between 0 and 100")
    @DecimalMax(value = "100.0", message = "IGDB rating must be between 0 and 100")
    private Double igdbRating;

    @NotNull(message = "Status is required")
    private GameStatus status;

    @Min(value = 1, message = "Rating must be between 1 and 10")
    @Max(value = 10, message = "Rating must be between 1 and 10")
    private Integer rating;
}

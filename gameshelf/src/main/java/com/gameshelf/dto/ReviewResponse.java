package com.gameshelf.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;
import java.time.LocalDateTime;

@Getter
@AllArgsConstructor
public class ReviewResponse {
    private Long id;
    private String username;
    private Integer rating;
    private String reviewText;
    private boolean spoiler;
    private boolean mine;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}

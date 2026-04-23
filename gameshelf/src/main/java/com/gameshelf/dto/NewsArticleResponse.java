package com.gameshelf.dto;

import java.time.Instant;

public record NewsArticleResponse(
    Long id,
    String title,
    String source,
    String url,
    String description,
    String imageUrl,
    Instant publishedAt
) {}

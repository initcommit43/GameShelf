package com.gameshelf.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "news_articles",
    uniqueConstraints = @UniqueConstraint(name = "uq_news_url", columnNames = "url"),
    indexes = @Index(name = "idx_news_published_at", columnList = "published_at")
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class NewsArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 512)
    private String title;

    @Column(nullable = false, length = 100)
    private String source;

    @Column(nullable = false, length = 1024)
    private String url;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 1024)
    private String imageUrl;

    @Column(name = "published_at", nullable = false)
    private Instant publishedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}

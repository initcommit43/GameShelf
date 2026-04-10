package com.gameshelf.model;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "games")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "igdb_id", unique = true)
    private Integer igdbId;

    @Column(nullable = false)
    private String title;

    @Column(name = "cover_url")
    private String coverUrl;

    @Column(name = "release_year")
    private String releaseYear;

    @Column(name = "igdb_rating")
    private Double igdbRating;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }
}
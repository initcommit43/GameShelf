package com.gameshelf.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(
    name = "blocked_tokens",
    uniqueConstraints = @UniqueConstraint(name = "uq_blocked_token", columnNames = "token"),
    indexes = @Index(name = "idx_blocked_token_expires_at", columnList = "expires_at")
)
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class BlockedToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String token;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
}

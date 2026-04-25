package com.gameshelf.dto;

import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor
public class StatsResponse {
    private long totalUsers;
    private long totalShelfEntries;
    private long totalReviews;
}

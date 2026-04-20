package com.gameshelf.dto;

import lombok.*;

import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GamePriceResponse {

    private String gameName;
    private SteamPrice steamPrice;   // null when game is not on Steam or free
    private BestPrice bestPrice;     // null when no deals found at all
    private List<StoreOffer> offers; // all stores, sorted by price ascending

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class SteamPrice {
        private String price;    // formatted, e.g. "$19.99" or "Free"
        private int discount;    // 0 when no active sale
        private String url;
    }

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class BestPrice {
        private String price;
        private String store;
        private String url;
    }
}

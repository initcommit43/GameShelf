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
    private List<StoreOffer> offers; // named stores, sorted by price ascending

    // Market-wide summary rows (e.g. GG.deals "Best retail" / "Key shops").
    // Kept apart from `offers` because they are aggregates, not stores you can buy from.
    private List<PriceAggregate> aggregates;

    // Providers that failed this request (bad key, outage, rate limit). Empty when all healthy.
    // Lets the UI tell "no deals exist" apart from "we couldn't reach a price source".
    private List<String> degradedProviders;

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

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PriceAggregate {
        private String label;    // e.g. "Best retail"
        private String price;
        private String url;
        private String source;   // provider name, for attribution
    }
}

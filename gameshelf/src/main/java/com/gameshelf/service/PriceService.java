package com.gameshelf.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameshelf.dto.GamePriceResponse;
import com.gameshelf.dto.StoreOffer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import com.github.ben-manes.caffeine.cache.Cache;
import com.github.ben-manes.caffeine.cache.Caffeine;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Service
@Slf4j
public class PriceService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ggdeals.api-key:}")
    private String ggDealsApiKey;

    // Built in @PostConstruct so @Value fields are populated first
    private RestClient steamClient;
    private RestClient ggDealsClient; // null when API key not configured

    private final Cache<Integer, GamePriceResponse> cache = Caffeine.newBuilder()
            .maximumSize(1_000)
            .expireAfterWrite(6, TimeUnit.HOURS)
            .build();

    @jakarta.annotation.PostConstruct
    public void init() {
        steamClient = RestClient.builder()
                .baseUrl("https://store.steampowered.com/api")
                .build();

        ggDealsApiKey = ggDealsApiKey.trim();
        if (!ggDealsApiKey.isBlank()) {
            // GG.deals API key is passed as a query param (?key=…), not a header
            ggDealsClient = RestClient.builder()
                    .baseUrl("https://api.gg.deals/v1")
                    .build();
            log.info("GG.deals client initialised");
        } else {
            log.info("GG.deals API key not configured — store offers will be omitted");
        }
    }

    // ── Public API ──────────────────────────────────────────────────────────────

    public GamePriceResponse getPrices(Integer igdbId, String gameName, Integer steamAppId) {
        GamePriceResponse cached = cache.getIfPresent(igdbId);
        if (cached != null) return cached;

        GamePriceResponse response = buildResponse(gameName, steamAppId);
        cache.put(igdbId, response);
        return response;
    }

    // ── Aggregation ─────────────────────────────────────────────────────────────

    private GamePriceResponse buildResponse(String gameName, Integer steamAppId) {
        log.info("[prices] building response for '{}' steamAppId={}", gameName, steamAppId);

        GamePriceResponse.SteamPrice steamPrice =
                (steamAppId != null) ? fetchSteamPrice(steamAppId) : null;
        log.info("[prices] steamPrice={}", steamPrice != null ? steamPrice.getPrice() : "null");

        List<StoreOffer> ggOffers =
                (ggDealsClient != null && steamAppId != null) ? fetchGgDealsOffers(steamAppId) : List.of();
        log.info("[prices] ggOffers count={}", ggOffers.size());

        // Merge: start with GG.deals offers, prepend Steam if GG.deals doesn't already
        // list it (GG.deals sometimes includes official Steam pricing too).
        List<StoreOffer> allOffers = new ArrayList<>(ggOffers);
        if (steamPrice != null) {
            boolean alreadyPresent = allOffers.stream()
                    .anyMatch(o -> "Steam".equalsIgnoreCase(o.getStoreName()));
            if (!alreadyPresent) {
                allOffers.add(StoreOffer.builder()
                        .storeName("Steam")
                        .price(steamPrice.getPrice())
                        .discount(steamPrice.getDiscount())
                        .url(steamPrice.getUrl())
                        .build());
            }
        }

        allOffers.sort(Comparator.comparingDouble(o -> parseAmount(o.getPrice())));

        GamePriceResponse.BestPrice bestPrice = null;
        if (!allOffers.isEmpty()) {
            StoreOffer top = allOffers.get(0);
            bestPrice = GamePriceResponse.BestPrice.builder()
                    .price(top.getPrice())
                    .store(top.getStoreName())
                    .url(top.getUrl())
                    .build();
        }

        return GamePriceResponse.builder()
                .gameName(gameName)
                .steamPrice(steamPrice)
                .bestPrice(bestPrice)
                .offers(allOffers)
                .build();
    }

    // ── Steam ────────────────────────────────────────────────────────────────────

    private GamePriceResponse.SteamPrice fetchSteamPrice(Integer appId) {
        try {
            String json = steamClient.get()
                    .uri("/appdetails?appids={id}&filters=price_overview&cc=us", appId)
                    .retrieve()
                    .body(String.class);

            log.info("[steam] raw response for appId={}: {}", appId, json);

            if (json == null) return null;

            JsonNode appNode = objectMapper.readTree(json).path(String.valueOf(appId));
            if (!appNode.path("success").asBoolean(false)) {
                log.info("[steam] success=false for appId={}", appId);
                return null;
            }

            JsonNode data = appNode.path("data");
            String storeUrl = "https://store.steampowered.com/app/" + appId;

            if (data.path("is_free").asBoolean(false)) {
                log.info("[steam] game is free, appId={}", appId);
                return GamePriceResponse.SteamPrice.builder()
                        .price("Free").discount(0).url(storeUrl).build();
            }

            JsonNode po = data.path("price_overview");
            if (po.isMissingNode()) {
                log.info("[steam] no price_overview for appId={} (DLC, bundle, or region-locked?)", appId);
                return null;
            }

            return GamePriceResponse.SteamPrice.builder()
                    .price(po.path("final_formatted").asText())
                    .discount(po.path("discount_percent").asInt(0))
                    .url(storeUrl)
                    .build();

        } catch (Exception e) {
            log.warn("[steam] fetch failed (appId={}): {}", appId, e.getMessage());
            return null;
        }
    }

    // ── GG.deals ─────────────────────────────────────────────────────────────────

    // GG.deals API: prices/by-steam-app-id — returns best retail + keyshop price for a Steam app.
    // Key goes as query param ?key=…, not a header.
    // Response: { "data": { "{appid}": { "url": "…", "prices": { "currentRetail": "9.99",
    //                                   "currentKeyshops": "6.49", "currency": "USD" } } } }
    private List<StoreOffer> fetchGgDealsOffers(Integer steamAppId) {
        try {
            log.info("[ggdeals] fetching prices for steamAppId={}", steamAppId);

            String json = ggDealsClient.get()
                    .uri("/prices/by-steam-app-id/?ids={id}&key={key}&region=us", steamAppId, ggDealsApiKey)
                    .retrieve()
                    .body(String.class);

            log.info("[ggdeals] response: {}", json);

            if (json == null) return List.of();

            JsonNode gameNode = objectMapper.readTree(json)
                    .path("data")
                    .path(String.valueOf(steamAppId));

            if (gameNode.isMissingNode() || gameNode.isNull()) {
                log.info("[ggdeals] no data for steamAppId={}", steamAppId);
                return List.of();
            }

            String gameUrl  = gameNode.path("url").asText("#");
            JsonNode prices = gameNode.path("prices");

            List<StoreOffer> offers = new ArrayList<>();

            String retail = prices.path("currentRetail").asText(null);
            if (retail != null && !retail.equals("null") && !retail.isBlank()) {
                offers.add(StoreOffer.builder()
                        .storeName("Best retail")
                        .price("$" + retail)
                        .discount(0)
                        .url(gameUrl)
                        .build());
            }

            String keyshops = prices.path("currentKeyshops").asText(null);
            if (keyshops != null && !keyshops.equals("null") && !keyshops.isBlank()) {
                offers.add(StoreOffer.builder()
                        .storeName("Key shops")
                        .price("$" + keyshops)
                        .discount(0)
                        .url(gameUrl)
                        .build());
            }

            return offers;

        } catch (Exception e) {
            log.warn("[ggdeals] fetch failed (steamAppId={}): {}", steamAppId, e.getMessage());
            return List.of();
        }
    }

    // ── Utilities ────────────────────────────────────────────────────────────────

    /** Strips currency symbols and parses to double. Free → 0.0. */
    private double parseAmount(String price) {
        if (price == null || price.equalsIgnoreCase("free")) return 0.0;
        try { return Double.parseDouble(price.replaceAll("[^0-9.]", "")); }
        catch (Exception e) { return Double.MAX_VALUE; }
    }

}

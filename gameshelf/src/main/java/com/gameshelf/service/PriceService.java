package com.gameshelf.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.gameshelf.dto.GamePriceResponse;
import com.gameshelf.dto.StoreOffer;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@Slf4j
public class PriceService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${ggdeals.api-key:}")
    private String ggDealsApiKey;

    // CheapShark rejects generic/absent User-Agents with a 400, so this must identify the app.
    @Value("${cheapshark.user-agent:GameShelf/1.0 (+https://github.com/initcommit43/GameShelf)}")
    private String cheapSharkUserAgent;

    // Initialized in @PostConstruct so @Value fields are available first
    private RestClient steamClient;
    private RestClient cheapSharkClient;
    private RestClient ggDealsClient; // null when key not configured

    private static final long CACHE_TTL_MS = 6 * 60 * 60 * 1_000L;
    // A response missing a provider is re-fetched sooner, so an outage doesn't stick for 6h.
    private static final long DEGRADED_CACHE_TTL_MS = 10 * 60 * 1_000L;
    private static final long STORE_MAP_TTL_MS = 24 * 60 * 60 * 1_000L;

    private static final String PROVIDER_STEAM = "Steam";
    private static final String PROVIDER_CHEAPSHARK = "CheapShark";
    private static final String PROVIDER_GGDEALS = "GG.deals";

    private final ConcurrentHashMap<Integer, CachedEntry> cache = new ConcurrentHashMap<>();

    private volatile Map<String, String> cheapSharkStores = Map.of();
    private volatile long cheapSharkStoresFetchedAt = 0L;

    @jakarta.annotation.PostConstruct
    public void init() {
        steamClient = RestClient.builder()
                .baseUrl("https://store.steampowered.com/api")
                .build();

        cheapSharkClient = RestClient.builder()
                .baseUrl("https://www.cheapshark.com/api/1.0")
                .defaultHeader("User-Agent", cheapSharkUserAgent)
                .build();

        ggDealsApiKey = ggDealsApiKey.trim();
        if (!ggDealsApiKey.isBlank()) {
            // GG.deals API key is passed as a query param (?key=…), not a header
            ggDealsClient = RestClient.builder()
                    .baseUrl("https://api.gg.deals/v1")
                    .build();
            log.info("GG.deals client initialised");
        } else {
            log.info("GG.deals API key not configured — market summary will be omitted");
        }
    }

    public GamePriceResponse getPrices(Integer igdbId, String gameName, Integer steamAppId) {
        CachedEntry hit = cache.get(igdbId);
        if (hit != null && !hit.isExpired()) return hit.response();

        GamePriceResponse response = buildResponse(gameName, steamAppId);
        cache.put(igdbId, new CachedEntry(response));
        return response;
    }

    private GamePriceResponse buildResponse(String gameName, Integer steamAppId) {
        log.info("[prices] building response for '{}' steamAppId={}", gameName, steamAppId);

        List<String> degraded = new ArrayList<>();

        GamePriceResponse.SteamPrice steamPrice = null;
        if (steamAppId != null) {
            steamPrice = fetchSteamPrice(steamAppId, degraded);
        }
        log.info("[prices] steamPrice={}", steamPrice != null ? steamPrice.getPrice() : "null");

        List<StoreOffer> storeOffers =
                (steamAppId != null) ? fetchCheapSharkOffers(steamAppId, degraded) : List.of();
        log.info("[prices] cheapshark offers={}", storeOffers.size());

        List<GamePriceResponse.PriceAggregate> aggregates =
                (ggDealsClient != null && steamAppId != null)
                        ? fetchGgDealsAggregates(steamAppId, degraded)
                        : List.of();
        log.info("[prices] ggdeals aggregates={}", aggregates.size());

        // CheapShark already lists Steam; prefer Steam's own API for it since that price is
        // region-correct and carries the real discount percentage.
        List<StoreOffer> allOffers = new ArrayList<>();
        if (steamPrice != null) {
            allOffers.add(StoreOffer.builder()
                    .storeName(PROVIDER_STEAM)
                    .price(steamPrice.getPrice())
                    .discount(steamPrice.getDiscount())
                    .url(steamPrice.getUrl())
                    .build());
        }
        for (StoreOffer offer : storeOffers) {
            boolean duplicateSteam = steamPrice != null && PROVIDER_STEAM.equalsIgnoreCase(offer.getStoreName());
            if (!duplicateSteam) allOffers.add(offer);
        }

        allOffers.sort(Comparator.comparingDouble(o -> parseAmount(o.getPrice())));

        // Best price is drawn only from real stores — an aggregate row is not something you can buy.
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
                .aggregates(aggregates)
                .degradedProviders(degraded)
                .build();
    }

    // Steam

    private GamePriceResponse.SteamPrice fetchSteamPrice(Integer appId, List<String> degraded) {
        try {
            String json = steamClient.get()
                    .uri("/appdetails?appids={id}&filters=price_overview&cc=us", appId)
                    .retrieve()
                    .body(String.class);

            log.debug("[steam] raw response for appId={}: {}", appId, json);

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
            // Reached Steam but it failed — that's a provider outage, not a priceless game.
            log.warn("[steam] fetch failed (appId={}): {}", appId, e.getMessage());
            degraded.add(PROVIDER_STEAM);
            return null;
        }
    }

    // CheapShark — the per-store comparison. No API key required.

    private List<StoreOffer> fetchCheapSharkOffers(Integer steamAppId, List<String> degraded) {
        Map<String, String> stores = activeStoreNames(degraded);
        if (stores.isEmpty()) return List.of();

        try {
            String json = cheapSharkClient.get()
                    .uri("/deals?steamAppID={id}&pageSize=60", steamAppId)
                    .retrieve()
                    .body(String.class);

            if (json == null) return List.of();

            JsonNode deals = objectMapper.readTree(json);
            if (!deals.isArray()) return List.of();

            // One row per store, keeping the cheapest deal when a store lists several.
            Map<String, StoreOffer> cheapestByStore = new LinkedHashMap<>();

            for (JsonNode deal : deals) {
                String storeName = stores.get(deal.path("storeID").asText());
                if (storeName == null) continue; // inactive or unknown store

                String salePrice = deal.path("salePrice").asText(null);
                if (salePrice == null || salePrice.isBlank()) continue;

                String dealId = deal.path("dealID").asText(null);
                if (dealId == null || dealId.isBlank()) continue;

                int discount = (int) Math.round(deal.path("savings").asDouble(0));
                String normalPrice = deal.path("normalPrice").asText(null);

                StoreOffer offer = StoreOffer.builder()
                        .storeName(storeName)
                        .price(formatUsd(salePrice))
                        .normalPrice(discount > 0 ? formatUsd(normalPrice) : null)
                        .discount(discount)
                        // dealID arrives URL-encoded, so it is concatenated rather than passed
                        // as a URI template variable (which would double-encode it).
                        .url("https://www.cheapshark.com/redirect?dealID=" + dealId)
                        .build();

                StoreOffer existing = cheapestByStore.get(storeName);
                if (existing == null || parseAmount(offer.getPrice()) < parseAmount(existing.getPrice())) {
                    cheapestByStore.put(storeName, offer);
                }
            }

            return new ArrayList<>(cheapestByStore.values());

        } catch (Exception e) {
            log.warn("[cheapshark] deals fetch failed (steamAppId={}): {}", steamAppId, e.getMessage());
            degraded.add(PROVIDER_CHEAPSHARK);
            return List.of();
        }
    }

    // storeID → storeName for active stores. Rarely changes, so it is cached for a day.
    private Map<String, String> activeStoreNames(List<String> degraded) {
        long now = Instant.now().toEpochMilli();
        Map<String, String> cached = cheapSharkStores;
        if (!cached.isEmpty() && now - cheapSharkStoresFetchedAt < STORE_MAP_TTL_MS) return cached;

        try {
            String json = cheapSharkClient.get().uri("/stores").retrieve().body(String.class);
            if (json == null) return cached;

            JsonNode arr = objectMapper.readTree(json);
            Map<String, String> stores = new LinkedHashMap<>();
            for (JsonNode store : arr) {
                if (store.path("isActive").asInt(0) != 1) continue;
                stores.put(store.path("storeID").asText(), store.path("storeName").asText());
            }

            if (!stores.isEmpty()) {
                cheapSharkStores = Map.copyOf(stores);
                cheapSharkStoresFetchedAt = now;
                log.info("[cheapshark] loaded {} active stores", stores.size());
            }
            return cheapSharkStores;

        } catch (Exception e) {
            log.warn("[cheapshark] store list fetch failed: {}", e.getMessage());
            if (cached.isEmpty()) degraded.add(PROVIDER_CHEAPSHARK);
            return cached; // stale map still beats no offers at all
        }
    }

    // GG.deals — market-wide aggregates, not individual stores.

    // API key goes as a query param, not a header — that's GG.deals' auth scheme.
    private List<GamePriceResponse.PriceAggregate> fetchGgDealsAggregates(Integer steamAppId, List<String> degraded) {
        try {
            log.info("[ggdeals] fetching prices for steamAppId={}", steamAppId);

            String json = ggDealsClient.get()
                    .uri("/prices/by-steam-app-id/?ids={id}&key={key}&region=us", steamAppId, ggDealsApiKey)
                    .retrieve()
                    .body(String.class);

            log.debug("[ggdeals] response: {}", json);

            if (json == null) return List.of();

            JsonNode root = objectMapper.readTree(json);
            if (!root.path("success").asBoolean(true)) {
                // Most often an expired or mistyped key — say so instead of silently dropping it.
                log.warn("[ggdeals] API rejected the request: {}", root.path("data").path("message").asText("unknown error"));
                degraded.add(PROVIDER_GGDEALS);
                return List.of();
            }

            JsonNode gameNode = root.path("data").path(String.valueOf(steamAppId));
            if (gameNode.isMissingNode() || gameNode.isNull()) {
                log.info("[ggdeals] no data for steamAppId={}", steamAppId);
                return List.of();
            }

            String gameUrl  = gameNode.path("url").asText("#");
            JsonNode prices = gameNode.path("prices");

            List<GamePriceResponse.PriceAggregate> aggregates = new ArrayList<>();
            addAggregate(aggregates, "Best retail", prices.path("currentRetail").asText(null), gameUrl);
            addAggregate(aggregates, "Key shops",   prices.path("currentKeyshops").asText(null), gameUrl);
            return aggregates;

        } catch (Exception e) {
            log.warn("[ggdeals] fetch failed (steamAppId={}): {}", steamAppId, e.getMessage());
            degraded.add(PROVIDER_GGDEALS);
            return List.of();
        }
    }

    private void addAggregate(List<GamePriceResponse.PriceAggregate> target,
                              String label, String rawPrice, String url) {
        if (rawPrice == null || rawPrice.isBlank() || rawPrice.equals("null")) return;
        target.add(GamePriceResponse.PriceAggregate.builder()
                .label(label)
                .price(formatUsd(rawPrice))
                .url(url)
                .source(PROVIDER_GGDEALS)
                .build());
    }

    // Utilities

    private String formatUsd(String amount) {
        if (amount == null || amount.isBlank()) return null;
        return amount.startsWith("$") ? amount : "$" + amount;
    }

    // Strips currency symbols. "Free" → 0.0.
    private double parseAmount(String price) {
        if (price == null || price.equalsIgnoreCase("free")) return 0.0;
        try { return Double.parseDouble(price.replaceAll("[^0-9.]", "")); }
        catch (Exception e) { return Double.MAX_VALUE; }
    }

    private record CachedEntry(GamePriceResponse response, long fetchedAt) {
        CachedEntry(GamePriceResponse r) { this(r, Instant.now().toEpochMilli()); }

        boolean isExpired() {
            List<String> degraded = response.getDegradedProviders();
            long ttl = (degraded != null && !degraded.isEmpty()) ? DEGRADED_CACHE_TTL_MS : CACHE_TTL_MS;
            return Instant.now().toEpochMilli() - fetchedAt > ttl;
        }
    }
}

package com.gameshelf.service;

import com.gameshelf.dto.NewsArticleResponse;
import com.gameshelf.model.NewsArticle;
import com.gameshelf.repository.NewsArticleRepository;
import com.rometools.rome.feed.synd.SyndEntry;
import com.rometools.rome.feed.synd.SyndFeed;
import com.rometools.rome.io.SyndFeedInput;
import com.rometools.rome.io.XmlReader;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URL;
import java.net.URLConnection;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NewsService {

    private final NewsArticleRepository repository;

    private static final List<String[]> FEEDS = List.of(
        new String[]{"IGN",       "https://feeds.ign.com/ign/all"},
        new String[]{"PC Gamer",  "https://www.pcgamer.com/rss/"},
        new String[]{"Eurogamer", "https://www.eurogamer.net/feed/"},
        new String[]{"Polygon",   "https://www.polygon.com/rss/index.xml"},
        new String[]{"GameSpot",  "https://www.gamespot.com/feeds/mashup/"}
    );

    private static final Pattern IMG_SRC = Pattern.compile(
        "<img[^>]+src=[\"']([^\"']+)[\"']", Pattern.CASE_INSENSITIVE);

    @Scheduled(cron = "0 0 6 * * *")
    public void scheduledFetch() {
        fetchAndUpdateNews();
    }

    @EventListener(ApplicationReadyEvent.class)
    public void fetchOnStartupIfEmpty() {
        if (repository.count() == 0) {
            fetchAndUpdateNews();
        }
    }

    public void fetchAndUpdateNews() {
        log.info("Starting gaming news fetch");
        int saved = 0;
        for (String[] feed : FEEDS) {
            try {
                List<NewsArticle> articles = parseRSSFeed(feed[0], feed[1]);
                for (NewsArticle article : articles) {
                    if (saveIfNotExists(article)) saved++;
                }
                log.debug("Processed feed: {}", feed[0]);
            } catch (Exception e) {
                log.warn("Failed to fetch RSS feed from {}: {}", feed[0], e.getMessage());
            }
        }
        log.info("News fetch complete — {} new articles saved", saved);
    }

    List<NewsArticle> parseRSSFeed(String source, String feedUrl) throws Exception {
        URLConnection conn = new URL(feedUrl).openConnection();
        conn.setConnectTimeout(10_000);
        conn.setReadTimeout(15_000);
        conn.setRequestProperty("User-Agent", "GameShelf/1.0");

        SyndFeedInput input = new SyndFeedInput();
        SyndFeed feed;
        try (XmlReader reader = new XmlReader(conn.getInputStream())) {
            feed = input.build(reader);
        }

        return feed.getEntries().stream()
            .map(entry -> normalizeArticle(source, entry))
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
    }

    private NewsArticle normalizeArticle(String source, SyndEntry entry) {
        try {
            String title = entry.getTitle();
            String url = entry.getLink();
            if (title == null || title.isBlank() || url == null || url.isBlank()) return null;

            String rawDesc = entry.getDescription() != null ? entry.getDescription().getValue() : null;
            String imageUrl = extractImage(entry, rawDesc);
            String description = stripHtml(rawDesc);

            Date published = entry.getPublishedDate() != null
                ? entry.getPublishedDate()
                : entry.getUpdatedDate();
            Instant publishedAt = published != null ? published.toInstant() : Instant.now();

            return NewsArticle.builder()
                .title(title.trim())
                .source(source)
                .url(url.trim())
                .description(description)
                .imageUrl(imageUrl)
                .publishedAt(publishedAt)
                .build();
        } catch (Exception e) {
            log.debug("Skipping invalid entry from {}: {}", source, e.getMessage());
            return null;
        }
    }

    private String extractImage(SyndEntry entry, String descHtml) {
        if (entry.getEnclosures() != null) {
            var enclosureImg = entry.getEnclosures().stream()
                .filter(enc -> enc.getType() != null && enc.getType().startsWith("image/"))
                .map(enc -> enc.getUrl())
                .filter(u -> u != null && !u.isBlank())
                .findFirst();
            if (enclosureImg.isPresent()) return enclosureImg.get();
        }
        if (descHtml != null) {
            Matcher m = IMG_SRC.matcher(descHtml);
            if (m.find()) return m.group(1);
        }
        return null;
    }

    private String stripHtml(String html) {
        if (html == null) return null;
        String text = html.replaceAll("<[^>]+>", " ").replaceAll("\\s+", " ").trim();
        if (text.isEmpty()) return null;
        return text.length() > 500 ? text.substring(0, 500) : text;
    }

    @Transactional
    boolean saveIfNotExists(NewsArticle article) {
        if (repository.existsByUrl(article.getUrl())) return false;
        repository.save(article);
        return true;
    }

    public Page<NewsArticleResponse> getNews(Pageable pageable, String source) {
        Page<NewsArticle> page = (source != null && !source.isBlank())
            ? repository.findBySource(source, pageable)
            : repository.findAll(pageable);
        return page.map(this::toResponse);
    }

    private NewsArticleResponse toResponse(NewsArticle a) {
        return new NewsArticleResponse(
            a.getId(), a.getTitle(), a.getSource(), a.getUrl(),
            a.getDescription(), a.getImageUrl(), a.getPublishedAt()
        );
    }
}

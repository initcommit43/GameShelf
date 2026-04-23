package com.gameshelf.repository;

import com.gameshelf.model.NewsArticle;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface NewsArticleRepository extends JpaRepository<NewsArticle, Long> {

    boolean existsByUrl(String url);

    Page<NewsArticle> findBySource(String source, Pageable pageable);
}

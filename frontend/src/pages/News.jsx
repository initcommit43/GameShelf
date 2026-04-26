import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { newsService } from '../services/api'
import BottomNav from '../components/BottomNav'
import styles from './News.module.css'

const SOURCES = ['IGN', 'PC Gamer', 'Eurogamer', 'Polygon', 'GameSpot']

function formatDate(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  const diffMs = Date.now() - date.getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  const diffD = Math.floor(diffMs / 86_400_000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  if (diffD < 7) return `${diffD}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function SkeletonCard() {
  return (
    <div className={styles.skeletonCard}>
      <div className={styles.skeletonThumb} />
      <div className={styles.skeletonBody}>
        <div className={`${styles.skeletonLine} ${styles.skMeta}`} />
        <div className={`${styles.skeletonLine} ${styles.skTitle}`} />
        <div className={`${styles.skeletonLine} ${styles.skDesc}`} />
        <div className={`${styles.skeletonLine} ${styles.skDescShort}`} />
      </div>
    </div>
  )
}

function NewsCard({ article }) {
  return (
    <a
      href={article.url}
      target="_blank"
      rel="noopener noreferrer"
      className={styles.card}
    >
      <div className={styles.cardThumb}>
        <div className={styles.cardThumbPlaceholder}>{article.source}</div>
        {article.imageUrl && (
          <img
            src={article.imageUrl}
            alt=""
            className={styles.cardThumbImg}
            onError={e => { e.currentTarget.style.display = 'none' }}
          />
        )}
      </div>
      <div className={styles.cardBody}>
        <div className={styles.cardMeta}>
          <span className={styles.cardSource}>{article.source}</span>
          <span className={styles.cardDot}>·</span>
          <span className={styles.cardDate}>{formatDate(article.publishedAt)}</span>
        </div>
        <h2 className={styles.cardTitle}>{article.title}</h2>
        {article.description && (
          <p className={styles.cardDesc}>{article.description}</p>
        )}
      </div>
    </a>
  )
}

function News() {
  const navigate = useNavigate()
  const [articles, setArticles] = useState([])
  const [source, setSource] = useState(null)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(null)

  const loadArticles = useCallback(async (pageNum, src, append) => {
    const data = await newsService.getNews(pageNum, 20, src)
    setArticles(prev => append ? [...prev, ...data.content] : data.content)
    setHasMore(!data.last)
    setPage(pageNum + 1)
  }, [])

  useEffect(() => {
    setLoading(true)
    setError(null)
    loadArticles(0, source, false)
      .catch(() => setError('Could not load news. Try again later.'))
      .finally(() => setLoading(false))
  }, [source, loadArticles])

  const handleLoadMore = async () => {
    setLoadingMore(true)
    try {
      await loadArticles(page, source, true)
    } catch {
      setError('Failed to load more articles.')
    } finally {
      setLoadingMore(false)
    }
  }

  const toggleSource = (s) => setSource(prev => prev === s ? null : s)

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLeft}>
            <span className={styles.navLogo} onClick={() => navigate('/')}>GameShelf</span>
            <div className={styles.navLinks}>
              <a className={styles.navLink} onClick={() => navigate('/')}>Explore</a>
              <span className={styles.navLinkActive}>News</span>
            </div>
          </div>
        </div>
      </nav>

      <div className={styles.content}>
        <div className={styles.header}>
          <h1 className={styles.title}>Gaming News</h1>
        </div>

        <div className={styles.filterBar}>
          {SOURCES.map(s => (
            <button
              key={s}
              className={`${styles.filterPill} ${source === s ? styles.filterPillActive : ''}`}
              onClick={() => toggleSource(s)}
            >
              {s}
            </button>
          ))}
        </div>

        {error && <p className={styles.errorMsg}>{error}</p>}

        {loading ? (
          <div className={styles.list}>
            {Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : articles.length === 0 ? (
          <div className={styles.emptyState}>
            No news articles found.
          </div>
        ) : (
          <>
            <div className={styles.list}>
              {articles.map(a => <NewsCard key={a.id} article={a} />)}
            </div>
            {hasMore && (
              <button
                className={styles.loadMoreBtn}
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            )}
          </>
        )}
      </div>
      <BottomNav />
    </div>
  )
}

export default News

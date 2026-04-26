import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameService, logService, statsService, newsService } from '../services/api'
import BottomNav from '../components/BottomNav'
import AddToShelfSheet from '../components/AddToShelfSheet/AddToShelfSheet'
import styles from './Landing.module.css'


// To swap these out, search for the game in the app and grab the ID from the URL.
const EDITORIAL_IGDB_IDS = [7351, 1942, 119171, 1020] // Doom, Witcher 3, Baldur's Gate 3, GTA 5

function formatRelativeDate(iso) {
  if (!iso) return ''
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffH = Math.floor(diffMs / 3_600_000)
  const diffD = Math.floor(diffMs / 86_400_000)
  if (diffH < 1) return 'Just now'
  if (diffH < 24) return `${diffH}h ago`
  return `${diffD} day${diffD !== 1 ? 's' : ''} ago`
}

function formatCount(n) {
  if (n == null) return '—'
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace(/\.0$/, '') + 'K'
  return String(n)
}

function Landing() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('token')
  const [heroQuery, setHeroQuery] = useState('')
  const [trendingGames, setTrendingGames] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [editorialCovers, setEditorialCovers] = useState([])

  const [selected, setSelected] = useState(null)
  const [successMsg, setSuccessMsg] = useState('')
  const [stats, setStats] = useState(null)
  const [newsArticles, setNewsArticles] = useState([])

  useEffect(() => {
    gameService.getTrending()
      .then(data => setTrendingGames(data.slice(0, 12)))
      .catch(() => setTrendingGames([]))
      .finally(() => setTrendingLoading(false))

    statsService.getStats().then(setStats).catch(() => {})

    newsService.getNews(0, 3)
      .then(data => setNewsArticles(data.content || []))
      .catch(() => {})

    if (isLoggedIn) {
      Promise.all(EDITORIAL_IGDB_IDS.map(id => gameService.getDetails(id)))
        .then(games => setEditorialCovers(games.filter(g => g?.coverUrl)))
        .catch(() => {})
    }
  }, [])

  const openSheet = (e, game) => {
    e.stopPropagation()
    if (!isLoggedIn) { navigate('/login'); return }
    setSelected(game)
    setSuccessMsg('')
  }

  const handleAddToShelf = async (status, rating) => {
    try {
      await logService.addLog({ igdbId: selected.igdbId, title: selected.title, coverUrl: selected.coverUrl, status, rating: rating ?? undefined })
      setSelected(null)
      setSuccessMsg(`"${selected.title}" added to your shelf.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setSelected(null)
      setSuccessMsg('Already on your shelf.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  return (
    <div className={styles.page}>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navLeft}>
            <span className={styles.navLogo}>GameShelf</span>
            <div className={styles.navLinks}>
              <a className={styles.navLinkActive}>Explore</a>
              <a className={styles.navLink} onClick={() => navigate('/news')} style={{ cursor: 'pointer' }}>News</a>
            </div>
          </div>
          <div className={styles.navRight}>
            {isLoggedIn ? (
              <button className={styles.navRegisterBtn} onClick={() => navigate('/shelf')}>My Shelf</button>
            ) : (
              <>
                <button className={styles.navLoginBtn} onClick={() => navigate('/login')}>Log In</button>
                <button className={styles.navRegisterBtn} onClick={() => navigate('/register')}>Register</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className={styles.main}>

        <section className={styles.hero}>
          <div className={styles.heroGlow} />
          <div className={styles.heroContent}>
            <h1 className={styles.heroHeadline}>
              Discover, collect, analyze your <em className={styles.heroAccent}>games</em>
            </h1>

            <form
              className={styles.heroSearch}
              onSubmit={(e) => { e.preventDefault(); if (heroQuery.trim()) navigate(`/search?q=${encodeURIComponent(heroQuery.trim())}`) }}
            >
              <span className={styles.heroSearchIcon}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              </span>
              <input
                className={styles.heroSearchInput}
                type="text"
                placeholder="Search for a game..."
                value={heroQuery}
                onChange={(e) => setHeroQuery(e.target.value)}
              />
              {heroQuery && (
                <button type="submit" className={styles.heroSearchBtn}>Search</button>
              )}
            </form>

            <div className={styles.heroStats}>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{formatCount(stats?.totalUsers)}</span>
                <span className={styles.heroStatLabel}>Members</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{formatCount(stats?.totalShelfEntries)}</span>
                <span className={styles.heroStatLabel}>Shelf Entries</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>{formatCount(stats?.totalReviews)}</span>
                <span className={styles.heroStatLabel}>Reviews</span>
              </div>
            </div>
            <div className={styles.heroCtas}>
              {!isLoggedIn && (
                <button className={styles.ctaPrimary} onClick={() => navigate('/register')}>
                  Create a free account
                </button>
              )}
              <button className={styles.ctaSecondary} onClick={() => navigate('/browse')}>
                Browse popular titles
              </button>
            </div>
          </div>
        </section>

        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Recently Trending</h2>
            </div>
            <a className={styles.viewAll} onClick={() => navigate('/browse')} style={{ cursor: 'pointer' }}>
              View All <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>arrow_forward</span>
            </a>
          </div>
          <div className={styles.trendingGrid}>
            {trendingLoading ? (
              Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className={styles.gameCard}>
                  <div className={`${styles.gameCover} ${styles.gameCoverSkeleton}`} />
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonMeta} />
                </div>
              ))
            ) : trendingGames.length === 0 ? (
              <p className={styles.trendingEmpty}>Could not load trending games.</p>
            ) : (
              trendingGames.map(game => (
                <div key={game.igdbId} className={styles.gameCard} onClick={() => navigate(`/games/${game.igdbId}`)}>
                  <div className={styles.gameCover}>
                    {game.coverUrl
                      ? <img src={game.coverUrl} alt={game.title} className={styles.gameCoverImg} />
                      : <div className={styles.gameCoverPlaceholder}>{game.title}</div>
                    }
                    <button className={styles.addOverlay} onClick={(e) => openSheet(e, game)}>+</button>
                  </div>
                  <h3 className={styles.gameCardTitle}>{game.title}</h3>
                </div>
              ))
            )}
          </div>
        </section>

        <section className={styles.editorial}>
          <div className={styles.editorialInner}>
            <div className={styles.editorialText}>
              <div>
                <h2 className={styles.editorialHeadline}>Your gaming life,<br />meticulously archived.</h2>
              </div>
              <p className={styles.editorialBody}>
                GameShelf is the definitive digital journal for the modern player. We've stripped away the noise of traditional social media to focus on what matters: your journey through virtual worlds. From the first credit to the platinum trophy, every moment is preserved in high-fidelity detail.
              </p>
              <div className={styles.editorialBadges}>
                <div className={styles.editorialBadge}>
                  <span className="material-symbols-outlined" style={{ color: '#7aafff' }}>verified</span>
                  <span className={styles.editorialBadgeText}>Verified Database</span>
                </div>
                <div className={styles.editorialBadge}>
                  <span className="material-symbols-outlined" style={{ color: '#7aafff' }}>analytics</span>
                  <span className={styles.editorialBadgeText}>Deep Analytics</span>
                </div>
              </div>
            </div>
            <div className={styles.editorialVisual}>
              <div className={styles.editorialCard}>
                <div className={styles.editorialIconGrid}>
                  {editorialCovers.length > 0
                    ? editorialCovers.map(game => (
                        <div key={game.igdbId} className={styles.editorialIconBox}>
                          <img src={game.coverUrl?.replace('t_cover_big', 't_1080p')} alt={game.title} className={styles.editorialIconBoxImg} />
                        </div>
                      ))
                    : Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className={`${styles.editorialIconBox} ${styles.editorialIconBoxSkeleton}`} />
                      ))
                  }
                </div>
              </div>
              <div className={styles.editorialOverlayCard}>
                <div className={styles.editorialOverlayTop}>
                  <div className={styles.editorialOverlayIcon}>
                    <span className="material-symbols-outlined" style={{ color: '#7aafff' }}>monitoring</span>
                  </div>
                  <div>
                    <p className={styles.editorialOverlayLabel}>Monthly XP</p>
                    <p className={styles.editorialOverlayValue}>+420 pts</p>
                  </div>
                </div>
                <div className={styles.xpBarTrack}>
                  <div className={styles.xpBarFill} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {newsArticles.length > 0 && (
          <section className={styles.section}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Latest News</h2>
              <a className={styles.viewAll} onClick={() => navigate('/news')} style={{ cursor: 'pointer' }}>
                View All <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: 'middle' }}>arrow_forward</span>
              </a>
            </div>
            <div className={styles.newsGrid}>
              {newsArticles.map(article => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.newsCard}
                >
                  {article.imageUrl && (
                    <div className={styles.newsCardImage}>
                      <img
                        src={article.imageUrl}
                        alt=""
                        className={styles.newsCardImg}
                        onError={e => { e.currentTarget.parentElement.style.display = 'none' }}
                      />
                    </div>
                  )}
                  <div className={styles.newsCardBody}>
                    <div className={styles.newsCardMeta}>
                      <span className={styles.newsCardSource}>{article.source}</span>
                      <span className={styles.newsCardDot}>·</span>
                      <span className={styles.newsCardDate}>{formatRelativeDate(article.publishedAt)}</span>
                    </div>
                    <h3 className={styles.newsCardTitle}>{article.title}</h3>
                    {article.description && (
                      <p className={styles.newsCardDesc}>{article.description}</p>
                    )}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

      </main>

      {successMsg && (
        <div className={successMsg.startsWith('Already') ? styles.errorBanner : styles.successBanner}>
          {successMsg}
        </div>
      )}

      <AddToShelfSheet
        game={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onConfirm={handleAddToShelf}
      />

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBottom}>
            <div className={styles.footerBottomLinks}>
              {['Privacy Policy', 'Terms of Service', 'API', 'Careers', 'Support'].map(l => (
                <a key={l} className={styles.footerLink}>{l}</a>
              ))}
            </div>
            <p>© 2026 GameShelf</p>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}

export default Landing

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameService, logService } from '../services/api'
import BottomNav from '../components/BottomNav'
import styles from './Landing.module.css'

const STATUSES = ['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']


// Find an ID by searching the game on the app and checking the URL on its detail page.
const EDITORIAL_IGDB_IDS = [7351, 1942, 119171, 1020] // Doom, Witcher 3, Baldurs Gate 3, GTA 5

const REVIEWS = [
  {
    user: 'Pixel_Architect', role: 'Expert Reviewer',
    text: '"The world design in Star Drift is unparalleled. I spent three hours just wandering the ship\'s lower decks looking at the lighting. A true technical marvel."',
    game: 'Star Drift: Void', stars: 5,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAgxAaeOKpj7tScSjrb6QJkQ62StrsBzkJFGdcpQW4EH9LSwziSwZvYcbA8-3NA2BqGkRJugMMnGpzM5t0dlwFrXaqPjsyguQzEBiyB8NYSwjTq3bQhiDMM93Ztbiagbquvjdm5ciIKl-B4LkVr7fTS2n37xLFEzuS4fMgZ4iKZMCksObpYq7evNleQaQHLAo2hwEOSe8_N_EAmDJ2Fc-Y4qYfsYscNT551CndlWOIKLqHfFZVZJzZhH4jyfJ6fQVhMgVkBLu01fkg',
  },
  {
    user: 'RetroRunner', role: 'Speedrunner',
    text: '"Abyssal Echoes might be too difficult for some, but for those who stick with it, the payoff is immense. The final boss is a test of pure skill."',
    game: 'Abyssal Echoes', stars: 4,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCH3YPKUFWnDHvAjh5ueHaQmiEyPASSMOH4HQdBarcqko4V-XpC5xMOc2xCF1GWkQ3J5faSFTsIu8EIGaE3BS31AQTRSEJ75jlVDyZDmhPYm2sYV7NFu1xX6jf0kMZnividoVWJ5c9h63OkVQ7_KwB4BvEXkSFZ80mJ1gf_DyLktXU0UFkG2kWPUh5TQiZFZu5ZekuXD7z3eEOxhFN0LPlJxta_FpOT9Tdg_OzjGHQyVIiKHpRpxHXYsDYuSP7n990-Wwf7zpZK1gg',
  },
  {
    user: 'LumiPlay', role: 'Journalist',
    text: '"I haven\'t felt this connected to a puzzle game since The Witness. Aetheria is beautiful, haunting, and incredibly smart."',
    game: 'Aetheria', stars: 5,
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCFiqGpwDF_tNWPaw7w7sq_b0Yb9RBmhlLDTA1wmt4b20AnUUTSWzPH31wjxFFnZFkRhkLczp9dnThvNxswnziwVKjV6tXEn-0EQFfHO5HeKbKcx-MNAFnKuzOzel4T9ZtOSqURYgxpd5KudEgVFtqJFCN-ndKQtsSNRU2hPflneDps5XNHC6piSn9KN0V7KSWAnSe0FlqfsonDc4b_gxe9LLZsqxwD4iW1nGlvyVESPPaIih8MRDkmF8UVDsAU-xqB4v7_krvaDWA',
  },
]

function StarRating({ count, total = 5 }) {
  return (
    <div className={styles.stars}>
      {Array.from({ length: total }, (_, i) => (
        <span key={i} className={`material-symbols-outlined ${styles.star} ${i < count ? styles.starFilled : ''}`}>
          star
        </span>
      ))}
    </div>
  )
}

function Landing() {
  const navigate = useNavigate()
  const isLoggedIn = !!localStorage.getItem('token')
  const [heroQuery, setHeroQuery] = useState('')
  const [trendingGames, setTrendingGames] = useState([])
  const [trendingLoading, setTrendingLoading] = useState(true)
  const [editorialCovers, setEditorialCovers] = useState([])

  const [selected, setSelected] = useState(null)
  const [shelfStatus, setShelfStatus] = useState('')
  const [shelfRating, setShelfRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')

  useEffect(() => {
    gameService.getTrending()
      .then(data => setTrendingGames(data.slice(0, 12)))
      .catch(() => setTrendingGames([]))
      .finally(() => setTrendingLoading(false))

    // Fetch the 4 editorial covers independently from trending
    Promise.all(EDITORIAL_IGDB_IDS.map(id => gameService.getDetails(id)))
      .then(games => setEditorialCovers(games.filter(g => g?.coverUrl)))
      .catch(() => {})
  }, [])

  const openSheet = (game) => {
    if (!isLoggedIn) { navigate('/login'); return }
    setSelected(game)
    setShelfStatus('')
    setShelfRating(null)
    setSuccessMsg('')
  }

  const closeSheet = () => {
    setSelected(null)
    setShelfStatus('')
    setShelfRating(null)
  }

  const handleAddToShelf = async () => {
    if (!shelfStatus) return
    setSubmitting(true)
    try {
      await logService.addLog({ igdbId: selected.igdbId, title: selected.title, coverUrl: selected.coverUrl, status: shelfStatus, rating: shelfRating ?? undefined })
      closeSheet()
      setSuccessMsg(`"${selected.title}" added to your shelf.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      closeSheet()
      setSuccessMsg('Already on your shelf.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.page}>

      {/* ── Nav ── */}
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

        {/* ── Hero ── */}
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
                <span className={styles.heroStatValue}>2.4M</span>
                <span className={styles.heroStatLabel}>Total Games</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>15M</span>
                <span className={styles.heroStatLabel}>Ratings</span>
              </div>
              <div className={styles.heroStat}>
                <span className={styles.heroStatValue}>840K</span>
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

        {/* ── Recently Trending ── */}
        <section className={styles.section}>
          <div className={styles.sectionHead}>
            <div>
              <h2 className={styles.sectionTitle}>Recently Trending</h2>
            </div>
            <a className={styles.viewAll}>
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
                <div key={game.igdbId} className={styles.gameCard} onClick={() => openSheet(game)}>
                  <div className={styles.gameCover}>
                    {game.coverUrl
                      ? <img src={game.coverUrl} alt={game.title} className={styles.gameCoverImg} />
                      : <div className={styles.gameCoverPlaceholder}>{game.title}</div>
                    }
                  </div>
                  <h3 className={styles.gameCardTitle}>{game.title}</h3>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── Editorial ── */}
        <section className={styles.editorial}>
          <div className={styles.editorialInner}>
            <div className={styles.editorialText}>
              <div>
                <span className={styles.editorialNumber}>01</span>
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
                          <img src={game.coverUrl} alt={game.title} className={styles.editorialIconBoxImg} />
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

        {/* ── Bento Features ── */}
        <section className={styles.section}>
          <div className={styles.bento}>

            {/* Track collection — wide */}
            <div className={styles.bentoTrack}>
              <div className={styles.bentoTrackText}>
                <h3 className={styles.bentoTitle}>Track your personal game collection</h3>
                <p className={styles.bentoBody}>Effortlessly manage your backlog and completed journeys with our intuitive tagging system.</p>
                <button className={styles.bentoLink} onClick={() => navigate('/register')}>
                  Start Tracking <span className="material-symbols-outlined" style={{ fontSize: 18, verticalAlign: 'middle' }}>trending_flat</span>
                </button>
              </div>
              <div className={styles.bentoTrackCovers}>
                {[
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuDn1SETX49JMLl7Xrw6JeQ77_cpil3-eclkMA7pSSqVK2D7ktmmCsf7F96F55hKzx5-FKuf1fjr05jZuBE9gH8G-cDNnThkioGeOJ0xNkfR-yc1CCrIyO-d_XqSOM36iEA_Nmxxa69ImkjWbKOtB3OjRI86N8aWvuocHkPGAxM3l_h1BtCfGU4hL7YBKuUA46cHiz17HETxPMx_YzW5WSP5rP3LsU9uREX4K3VqzCEqB0DdaM5Nr-xm7f1tuzUOMeOV_fkOpkHBGdM',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBnqeW2fXGqcvc-kqFoAifKbkbRuAiKvoCKt4YHOqsiEn20mxKF9Hbryi5dYP2qyMMnnX8z52_qxPPKBv43Fg2gDOZto2-wYE9m8enbeyhQEDsqQCRnPTAvd09bIV20w2AXj6hcvh0eH2rY-ykprT4GrhhKwxzEHdCqmlM6dq89oOc_-dGAcldT9jq4ecqGS-_jKRj3Ni2yNqRuseg0mL8TLLGFockZ8EOnfiunlH8Jhz1MF3Bkpybw-e6lzYVyeXAfK8rF5HoIlIQ',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuBhFfm4Tzajrfx4_Ef_FDJ7T_9G5Wu0auhrdV8Gf9kXYXFg9VymR2n5618Ld0jGP8R0nZl1pUpjuM8pwLb5F0uvu0Aa5v35kf_0W7WWzre16BsuVD4kIF10E0wUS1wXUyEriRYsr9yXAb2KtqDQRxep0l-dpZgjlwbFpTwsfFaJzDRej3mm3FdmmR9Vgypb1iTGQ7c15V0FrrkKFt3K71sJrXnQLFd7lNKl_ON9vWnDlq3CvAh9sAdz3IlfJkSSkeOo2We_JptbcOE',
                  'https://lh3.googleusercontent.com/aida-public/AB6AXuAZJ7gxpP5A5fZJdh-V1zg1v1Kfq4MPxG4s_dWUWJJU6GKshPdXLx4H4LftdVnejg8JWrX-X091y7Mc1XU-4vGWIA9OH4DyVN8xdCvljOiyQ7vDRn00EVEsh7G3PAgcZqkmmvhLiVsRorYg3X_ciERisVta8JkD26prKqGZzVBcBTQVeCIFY9E21jvv18blnrWsCn1vOwR7nQUqcVkw_oMARhlqsHHy6H8f52YwpUAGP7kiu6GMLd85UYGq0cWl4wSMzlB1n334egk',
                ].map((src, i) => (
                  <div key={i} className={styles.bentoMiniCover}>
                    <img src={src} alt="" className={styles.bentoMiniCoverImg} />
                  </div>
                ))}
              </div>
            </div>

            {/* Social activity — narrow */}
            <div className={styles.bentoActivity}>
              <h3 className={styles.bentoTitle}>Social Activity</h3>
              <div className={styles.activityFeed}>
                <div className={styles.activityItem}>
                  <img className={styles.activityAvatar} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBw2A_cXuWX1D7YDWhek3AipoX58a2zsazyWaFfJNPAQ2oNU7MCvc97rx4ysghFWZHF-r3wGSVAOQM2niBb3paSXukynXqYbQllNTAPBHrOxonXWOvQE-CVJdWe_wYmjghqsDs5YOEEYKoyyeAMOWV37etEcvIQ8VBm_qG22-Ew5Z0lZWK4zc_iN9mp6HoXzuoiGfG7eOrPKTChT9oF4_L-zwqIMH8w-yRi4FdYGDUFCr2_JUSSZ0tLbz0DGrUE-Ddo0Y3-Cl6NbS8" alt="Marcus" />
                  <div>
                    <p className={styles.activityText}><span className={styles.activityName}>Marcus</span> rated <em>Elden Ring</em></p>
                    <StarRating count={5} />
                  </div>
                </div>
                <div className={styles.activityItem}>
                  <img className={styles.activityAvatar} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBsGpXHJKQrTBBuUyHWUHVuUNZIa5svPVJ9xvpkPZHSNyhpBiXt4weY3cQrMfoOnSGo2MlvjhOZXTaS9mS7H7gcGL-YwZzWIUQ0g9E-sCTpxHzG-KMVX2rQ2Lx4Qrce-GmeJCbrSmP6-MmNRHvf7rBT7q28vvQkMSVtr2026rIPaYDZA5vMHvKDNBGyMAcr8uuAX43_2ar41emFwA20cTCYDV3cmlOS_rmhFbnjmAF0ePA1sIezSRJhjcc1bNkQAI70eKuarHQdsXs" alt="Sarah" />
                  <div>
                    <p className={styles.activityText}><span className={styles.activityName}>Sarah</span> logged 4 hours in <em>Destiny 2</em></p>
                    <p className={styles.activityTime}>2 Hours Ago</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Review feature */}
            <div className={styles.bentoReview}>
              <div className={styles.bentoReviewHead}>
                <h3 className={styles.bentoTitle}>Express your thoughts</h3>
                <span className={styles.criticBadge}>Critic Choice</span>
              </div>
              <div className={styles.reviewPreview}>
                <div className={styles.reviewPreviewGame}>
                  <img className={styles.reviewPreviewCover} src="https://lh3.googleusercontent.com/aida-public/AB6AXuAaeeAIJ9Ijyj2ScDIguki5dyGisV9iKgjS7_9h-OA-P9DgKahzyguEB6QFmIqtM3hz926vfe1Z0fQ3jDue-qYemlKTG_oOe16HYZXyDNolgEYOsp5MGiUctV1KIrH8vk2FalJuTbH0OOA2ddD9kAv-ady70dzLP5x_-V_jQlpSlN9C2EJTxG2yZ0RiHDAvEvKp7THrRZj7JsHXWmMINgxnR1MDAMfj0AJYN2cvsKoIVMFibzX6VFEm9Lipb1zaqKJlD12l8EtiUuo" alt="" />
                  <div>
                    <p className={styles.reviewPreviewTitle}>Ethereal Vanguard</p>
                    <p className={styles.reviewPreviewQuote}>"A masterclass in atmospheric storytelling. The combat system feels weighted and intentional."</p>
                  </div>
                </div>
                <div className={styles.reviewPreviewFooter}>
                  <StarRating count={4} />
                  <span className={styles.reviewPreviewScore}>4.0 / 5.0</span>
                </div>
              </div>
            </div>

            {/* Lists */}
            <div className={styles.bentoLists}>
              <div className={styles.bentoListsContent}>
                <h3 className={styles.bentoTitle}>Curate your legacy</h3>
                <p className={styles.bentoBody}>Create themed lists, ranked tiers, and specialized collections to share with the world.</p>
                <div className={styles.listTags}>
                  {['Soulslikes', 'Cozy Games', 'GOTY 2024'].map(tag => (
                    <span key={tag} className={styles.listTag}>{tag}</span>
                  ))}
                </div>
              </div>
              <span className="material-symbols-outlined" style={{ fontSize: 200, opacity: 0.12, position: 'absolute', right: -24, bottom: -24, lineHeight: 1, fontVariationSettings: "'wght' 100" }}>
                format_list_bulleted
              </span>
            </div>

          </div>
        </section>

        {/* ── Popular Reviews ── */}
        <section className={styles.section}>
          <div className={styles.reviewsHead}>
            <h2 className={styles.sectionTitle}>Popular Reviews</h2>
            <div className={styles.reviewsNav}>
              <button className={styles.reviewsNavBtn}><span className="material-symbols-outlined">chevron_left</span></button>
              <button className={styles.reviewsNavBtn}><span className="material-symbols-outlined">chevron_right</span></button>
            </div>
          </div>
          <div className={styles.reviewsGrid}>
            {REVIEWS.map(review => (
              <div key={review.user} className={styles.reviewCard}>
                <div>
                  <div className={styles.reviewerRow}>
                    <img className={styles.reviewerAvatar} src={review.avatar} alt={review.user} />
                    <div>
                      <p className={styles.reviewerName}>{review.user}</p>
                      <p className={styles.reviewerRole}>{review.role}</p>
                    </div>
                  </div>
                  <p className={styles.reviewText}>{review.text}</p>
                </div>
                <div className={styles.reviewFooter}>
                  <p className={styles.reviewGame}>{review.game}</p>
                  <StarRating count={review.stars} />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── News Banner ── */}
        <section className={styles.section}>
          <div className={styles.newsBanner}>
            <div className={styles.newsContent}>
              <span className={styles.newsTag}>Developer Update</span>
              <h2 className={styles.newsTitle}>GameShelf Roadmap</h2>
              <p className={styles.newsBody}>
                We're introducing real-time activity feeds, dynamic game hubs, and a completely rebuilt mobile experience. Discover how our new "Midnight" engine powers a faster, more beautiful shelf.
              </p>
              <button className={styles.newsBtn}>Read the full changelog</button>
            </div>
            <div className={styles.newsImageWrap}>
              <img className={styles.newsImage} src="https://lh3.googleusercontent.com/aida-public/AB6AXuBMXo2QuY0UwrnLeEaY6lx9YmtPNJv5XBoyjJPuzk9fJmWhSOEORDqeurJ4WU03Ms7g9vu3HT2ULQswtyGfdN_r90P_vutlAuRUBbChU_3xzV7WeGKr4Eow7arOH_eD9nVG-iz3HgpvH8-wfNxyqdPdOCAPlw5DqDhli2ovsV_2UjoPs-JQW7bJ7PA5nS1aTWBDcg-ajaZ1MZGG8TwubsXm1rwbGAkWYBnJLHWfJUQK2v0ZBI_lr7LrNkvk48b71mg0obhKZ6qUCss" alt="" />
            </div>
            <div className={styles.newsGlow} />
          </div>
        </section>

      </main>

      {/* ── Success / error banner ── */}
      {successMsg && (
        <div className={successMsg.startsWith('Already') ? styles.errorBanner : styles.successBanner}>
          {successMsg}
        </div>
      )}

      {/* ── Add to shelf modal ── */}
      {selected && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeSheet()}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />

            <div className={styles.sheetGame}>
              <div className={styles.sheetThumb}>
                {selected.coverUrl && <img src={selected.coverUrl} alt={selected.title} className={styles.sheetThumbImg} />}
              </div>
              <div className={styles.sheetGameTitle}>{selected.title}</div>
            </div>

            <div className={styles.sheetLabel}>Status</div>
            <div className={styles.statusRow}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`${styles.statusPill}${shelfStatus === s ? ` ${styles.statusPillActive}` : ''}`}
                  onClick={() => setShelfStatus(s)}
                >
                  {s.charAt(0) + s.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            <div className={styles.sheetLabel}>Rating (optional)</div>
            <div className={styles.ratingRow}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <button
                  key={n}
                  className={`${styles.ratingBtn}${shelfRating === n ? ` ${styles.ratingBtnActive}` : ''}`}
                  onClick={() => setShelfRating(shelfRating === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <button className={styles.confirmBtn} onClick={handleAddToShelf} disabled={!shelfStatus || submitting}>
              {submitting ? 'Adding...' : 'Add to shelf'}
            </button>
            <button className={styles.cancelBtn} onClick={closeSheet}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerGrid}>
            <div className={styles.footerBrand}>
              <span className={styles.footerLogo}>GameShelf</span>
              <p className={styles.footerTagline}>The digital archivist for your personal gaming history. Discover, log, and discuss.</p>
              <div className={styles.footerIcons}>
                <span className="material-symbols-outlined" style={{ opacity: 0.6, cursor: 'pointer' }}>public</span>
                <span className="material-symbols-outlined" style={{ opacity: 0.6, cursor: 'pointer' }}>rss_feed</span>
                <span className="material-symbols-outlined" style={{ opacity: 0.6, cursor: 'pointer' }}>hub</span>
              </div>
            </div>
            {[
              { heading: 'Popular Lists', links: ['Top 100 All Time', 'Hidden Gems', '2024 GOTY', 'Indie Darling'] },
              { heading: 'Coming Soon', links: ['Project Omega', 'Neon Skies', 'Vanguard II', 'Eco-Shift'] },
              { heading: 'Anticipated', links: ['Hollow Knight: Silksong', 'GTA VI', 'Death Stranding 2', 'Metroid Prime 4'] },
              { heading: 'Sleeper Hits', links: ['Signal Void', 'Dust & Neon', 'Pacific Drive', 'Chants of Sennaar'] },
            ].map(col => (
              <div key={col.heading}>
                <h4 className={styles.footerColHead}>{col.heading}</h4>
                <ul className={styles.footerLinks}>
                  {col.links.map(link => <li key={link}><a className={styles.footerLink}>{link}</a></li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className={styles.footerBottom}>
            <div className={styles.footerBottomLinks}>
              {['Privacy Policy', 'Terms of Service', 'API', 'Careers', 'Support'].map(l => (
                <a key={l} className={styles.footerLink}>{l}</a>
              ))}
            </div>
            <p>© 2024 GameShelf</p>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  )
}

export default Landing

import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { userService, BASE_URL } from '../services/api'
import Layout from '../components/Layout'
import styles from './UserProfile.module.css'

function GameScrollRow({ title, games, loading }) {
  if (loading) {
    return (
      <section className={styles.rowSection}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>{title}</span>
        </div>
        <div className={styles.scrollTrack}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonCover} />
              <div className={styles.skeletonTitle} />
            </div>
          ))}
        </div>
      </section>
    )
  }

  if (!games || games.length === 0) return null

  return (
    <section className={styles.rowSection}>
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>{title}</span>
      </div>
      <div className={styles.scrollTrack}>
        {games.map(g => (
          <Link key={g.logId} to={`/games/${g.igdbId}`} className={styles.scrollCard}>
            <div className={styles.scrollCoverWrapper}>
              {g.coverUrl
                ? <img src={g.coverUrl} alt={g.title} className={styles.scrollCoverImg} />
                : <div className={styles.scrollCoverEmpty}>{g.title}</div>
              }
              {g.rating && (
                <div className={styles.scrollRatingBadge}>{g.rating}</div>
              )}
            </div>
            <div className={styles.scrollTitle}>{g.title}</div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function UserProfile() {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const username = localStorage.getItem('username') ?? 'User'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    userService.getFullProfile()
      .then(data => setProfile(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = async () => {
    const token = localStorage.getItem('token')
    if (token) {
      try {
        await fetch(`${BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch { /* best-effort */ }
    }
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    localStorage.removeItem('shelf_filter')
    localStorage.removeItem('shelf_sort')
    localStorage.removeItem('shelf_view')
    navigate('/login')
  }

  const displayName = profile?.username ?? username

  return (
    <Layout title="Profile">
      <div className={styles.heroGlow} />

      <section className={styles.avatarSection}>
        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            <span className={styles.avatarLetter}>{displayName[0]}</span>
          </div>
        </div>

        <div className={styles.userName}>{displayName}</div>
        {profile?.joinedAt && (
          <div className={styles.userMeta}>Member since {profile.joinedAt}</div>
        )}
        {!profile && !loading && (
          <div className={styles.userMeta}>{username}</div>
        )}
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>▤</span>
          <div className={styles.statValue}>{loading ? '—' : (profile?.totalGames ?? 0)}</div>
          <div className={styles.statLabel}>Total Games</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}>✓</span>
          <div className={styles.statValue}>{loading ? '—' : (profile?.completedGames ?? 0)}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}>▶</span>
          <div className={styles.statValue}>{loading ? '—' : (profile?.playingGames ?? 0)}</div>
          <div className={styles.statLabel}>Playing</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>★</span>
          <div className={styles.statValue}>{loading ? '—' : (profile?.averageRating ?? '—')}</div>
          <div className={styles.statLabel}>Avg Rating</div>
        </div>
        {(loading || profile?.mostPlayedGenre) && (
          <div className={`${styles.statCard} ${styles.statCardWide}`}>
            <span className={`${styles.statIcon} ${styles.statIconAmber}`}>♟</span>
            <div className={styles.statValue}>{loading ? '—' : profile?.mostPlayedGenre}</div>
            <div className={styles.statLabel}>Fav Genre</div>
          </div>
        )}
      </section>

      <GameScrollRow
        title="Currently Playing"
        games={profile?.currentlyPlaying}
        loading={loading}
      />
      <GameScrollRow
        title="Recently Added"
        games={profile?.recentlyPlayed}
        loading={loading}
      />
      <GameScrollRow
        title="Top Rated"
        games={profile?.topRated}
        loading={loading}
      />

      <section className={styles.actions}>
        <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
      </section>
    </Layout>
  )
}

export default UserProfile

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logService } from '../services/api'
import Layout from '../components/Layout'
import styles from './UserProfile.module.css'

const statusClassMap = {
  PLAYING: styles.statusPlaying,
  COMPLETED: styles.statusCompleted,
  BACKLOG: styles.statusBacklog,
  DROPPED: styles.statusDropped,
  WISHLIST: styles.statusWishlist,
}

function UserProfile() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const username = localStorage.getItem('username') ?? 'User'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    logService.getLogs()
      .then(data => setLogs(data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login')
  }

  const total = logs.length
  const completed = logs.filter(l => l.status === 'COMPLETED').length
  const playing = logs.filter(l => l.status === 'PLAYING').length
  const rated = logs.filter(l => l.rating)
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, l) => sum + l.rating, 0) / rated.length).toFixed(1)
    : '—'

  const recent = [...logs].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <Layout title="Profile">
      <div className={styles.heroGlow} />

      <section className={styles.avatarSection}>
        <div className={styles.avatarRing}>
          <div className={styles.avatarInner}>
            <span className={styles.avatarLetter}>{username[0]}</span>
          </div>
        </div>
        <div className={styles.userName}>{username}</div>
        <div className={styles.userMeta}>{total} games logged</div>
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>▤</span>
          <div className={styles.statValue}>{loading ? '—' : total}</div>
          <div className={styles.statLabel}>Total Games</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}>✓</span>
          <div className={styles.statValue}>{loading ? '—' : completed}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}>▶</span>
          <div className={styles.statValue}>{loading ? '—' : playing}</div>
          <div className={styles.statLabel}>Playing</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>★</span>
          <div className={styles.statValue}>{loading ? '—' : avgRating}</div>
          <div className={styles.statLabel}>Avg Rating</div>
        </div>
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Recent Activity</span>
        </div>

        {loading ? (
          <div className={styles.emptyActivity}>Loading...</div>
        ) : recent.length === 0 ? (
          <div className={styles.emptyActivity}>No activity yet. Start adding games!</div>
        ) : (
          <div className={styles.activityList}>
            {recent.map(log => (
              <div key={log.id} className={styles.activityRow}>
                <div className={styles.activityThumb}>
                  {log.coverUrl
                    ? <img src={log.coverUrl} alt={log.gameTitle} className={styles.activityThumbImg} />
                    : <div className={styles.activityThumbPlaceholder}>{log.gameTitle}</div>
                  }
                </div>
                <div className={styles.activityInfo}>
                  <div className={styles.activityTitle}>{log.gameTitle}</div>
                  <div className={styles.activityMeta}>
                    <span className={`${styles.activityStatus} ${statusClassMap[log.status] ?? ''}`}>
                      {log.status.charAt(0) + log.status.slice(1).toLowerCase()}
                    </span>
                    {log.rating && (
                      <>
                        <span className={styles.activityDot}>·</span>
                        <span className={styles.activityRating}>{log.rating}/10</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.actions}>
        <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
      </section>
    </Layout>
  )
}

export default UserProfile

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logService } from '../services/api'
import styles from './Shelf.module.css'

const statusClassMap = {
  PLAYING: styles.statusPlaying,
  COMPLETED: styles.statusCompleted,
  BACKLOG: styles.statusBacklog,
  DROPPED: styles.statusDropped,
  WISHLIST: styles.statusWishlist,
}

function Shelf() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('ALL')
  const [viewMode, setViewMode] = useState('grid')
  const navigate = useNavigate()
  const username = localStorage.getItem('username')

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }
    fetchLogs()
  }, [])

  const fetchLogs = async () => {
    try {
      const data = await logService.getLogs()
      setLogs(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login')
  }

  const filters = ['ALL', 'PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

  const filteredLogs = activeFilter === 'ALL'
    ? logs
    : logs.filter(log => log.status === activeFilter)

  return (
    <div className={styles.app}>
      <nav className={styles.navbar}>
        <span className={styles.logo}>GameShelf</span>
        <div className={styles.navActions}>
          <button className={styles.navIconBtn} onClick={() => navigate('/search')} aria-label="Search games">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
          </button>
          <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
        </div>
      </nav>

      <div className={styles.content}>
        <div className={styles.profileSection}>
          <div className={styles.avatar}>{username?.[0]?.toUpperCase()}</div>
          <div>
            <div className={styles.username}>{username}</div>
            <div className={styles.gameCount}>{logs.length} games logged</div>
          </div>
        </div>

        <div className={styles.statsRow}>
          {['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED'].map(status => (
            <div key={status} className={styles.statCard}>
              <div className={styles.statLabel}>{status.charAt(0) + status.slice(1).toLowerCase()}</div>
              <div className={styles.statValue}>
                {logs.filter(l => l.status === status).length}
              </div>
            </div>
          ))}
        </div>

        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>My shelf</span>
          <div className={styles.viewToggle}>
            <button
              className={`${styles.toggleBtn}${viewMode === 'grid' ? ` ${styles.toggleActive}` : ''}`}
              onClick={() => setViewMode('grid')}
            >Grid</button>
            <button
              className={`${styles.toggleBtn}${viewMode === 'list' ? ` ${styles.toggleActive}` : ''}`}
              onClick={() => setViewMode('list')}
            >List</button>
          </div>
        </div>

        <div className={styles.filterScroll}>
          {filters.map(f => (
            <button
              key={f}
              className={`${styles.filterTab}${activeFilter === f ? ` ${styles.filterActive}` : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.empty}>Loading...</div>
        ) : filteredLogs.length === 0 ? (
          <div className={styles.empty}>No games here yet.</div>
        ) : viewMode === 'grid' ? (
          <div className={styles.grid}>
            {filteredLogs.map(log => (
              <div key={log.id} className={styles.gameCard}>
                <div className={styles.gameCover}>
                  {log.coverUrl
                    ? <img src={log.coverUrl} alt={log.gameTitle} className={styles.coverImg} />
                    : <div className={styles.coverPlaceholder}>{log.gameTitle}</div>
                  }
                  <div className={`${styles.statusBadge} ${statusClassMap[log.status] ?? ''}`}>
                    {log.status.charAt(0) + log.status.slice(1).toLowerCase()}
                  </div>
                </div>
                <div className={styles.gameTitle}>{log.gameTitle}</div>
                <div className={styles.gameRating}>
                  {log.rating ? `${log.rating}/10` : '—'}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.listSection}>
            {filteredLogs.map(log => (
              <div key={log.id} className={styles.listRow}>
                <div className={styles.listThumb}>
                  {log.coverUrl && <img src={log.coverUrl} alt={log.gameTitle} className={styles.listThumbImg} />}
                </div>
                <div className={styles.listInfo}>
                  <div className={styles.listGameTitle}>{log.gameTitle}</div>
                  <div className={`${styles.listBadge} ${statusClassMap[log.status] ?? ''}`}>
                    {log.status.charAt(0) + log.status.slice(1).toLowerCase()}
                  </div>
                </div>
                <div className={styles.listRating}>
                  {log.rating ? `${log.rating}/10` : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Shelf

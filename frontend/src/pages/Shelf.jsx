import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logService } from '../services/api'
import Layout from '../components/Layout'
import styles from './Shelf.module.css'

const STATUSES = ['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

const SORT_LABELS = {
  DATE_ADDED: 'Date added',
  RELEASE_YEAR: 'Release year',
  IGDB_SCORE: 'IGDB score',
  YOUR_RATING: 'Your rating',
}

const STATUS_SORT_ORDER = {
  PLAYING: 1,
  COMPLETED: 2,
  WISHLIST: 3,
  BACKLOG: 4,
  DROPPED: 5,
}

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

  const [editingLog, setEditingLog] = useState(null)
  const [editStatus, setEditStatus] = useState('')
  const [editRating, setEditRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [sortOption, setSortOption] = useState(null)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)

  const navigate = useNavigate()

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

  const openEdit = (log) => {
    setEditingLog(log)
    setEditStatus(log.status)
    setEditRating(log.rating ?? null)
  }

  const closeEdit = () => {
    setEditingLog(null)
    setEditStatus('')
    setEditRating(null)
  }

  const handleEditConfirm = async () => {
    if (!editStatus) return
    setSubmitting(true)
    try {
      const updated = await logService.updateLog(editingLog.id, editStatus, editRating)
      setLogs(prev => prev.map(l => l.id === updated.id ? updated : l))
      closeEdit()
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteConfirm = async () => {
    try {
      await logService.deleteLog(confirmDeleteId)
      setLogs(prev => prev.filter(l => l.id !== confirmDeleteId))
      setConfirmDeleteId(null)
    } catch (err) {
      console.error(err)
    }
  }

  const filters = ['ALL', 'PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

  const filteredLogs = activeFilter === 'ALL'
    ? logs
    : logs.filter(log => log.status === activeFilter)

  const displayedLogs = (() => {
    if (!sortOption) return filteredLogs
    const sorted = [...filteredLogs]
    if (STATUSES.includes(sortOption)) {
      return sorted.sort((a, b) => {
        const aOrder = a.status === sortOption ? 0 : STATUS_SORT_ORDER[a.status]
        const bOrder = b.status === sortOption ? 0 : STATUS_SORT_ORDER[b.status]
        if (aOrder !== bOrder) return aOrder - bOrder
        return a.gameTitle.localeCompare(b.gameTitle)
      })
    }
    if (sortOption === 'DATE_ADDED') {
      return sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    }
    if (sortOption === 'RELEASE_YEAR') {
      return sorted.sort((a, b) => {
        if (!a.releaseYear && !b.releaseYear) return 0
        if (!a.releaseYear) return 1
        if (!b.releaseYear) return -1
        return b.releaseYear.localeCompare(a.releaseYear)
      })
    }
    if (sortOption === 'IGDB_SCORE') {
      return sorted.sort((a, b) => {
        if (!a.igdbRating && !b.igdbRating) return 0
        if (!a.igdbRating) return 1
        if (!b.igdbRating) return -1
        return b.igdbRating - a.igdbRating
      })
    }
    if (sortOption === 'YOUR_RATING') {
      return sorted.sort((a, b) => {
        if (!a.rating && !b.rating) return 0
        if (!a.rating) return 1
        if (!b.rating) return -1
        return b.rating - a.rating
      })
    }
    return filteredLogs
  })()

  const deleteTarget = logs.find(l => l.id === confirmDeleteId)

  return (
    <Layout title="My Shelf">
      <div className={styles.sectionHeader}>
        <span className={styles.sectionTitle}>My shelf</span>
        <div className={styles.headerRight}>
          <div className={styles.sortWrapper}>
            <button
              className={`${styles.toggleBtn} ${styles.sortBtn}${sortOption ? ` ${styles.toggleActive}` : ''}`}
              onClick={() => setSortDropdownOpen(o => !o)}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="12" height="12">
                <line x1="4" y1="6" x2="20" y2="6"/><line x1="4" y1="12" x2="14" y2="12"/><line x1="4" y1="18" x2="9" y2="18"/>
              </svg>
              {sortOption ? SORT_LABELS[sortOption] ?? (sortOption.charAt(0) + sortOption.slice(1).toLowerCase()) : 'Sort'}
            </button>
            {sortDropdownOpen && (
              <div className={styles.sortDropdown}>
                <div className={styles.sortGroup}>
                  <div className={styles.sortGroupLabel}>By status</div>
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      className={`${styles.sortOption}${sortOption === s ? ` ${styles.sortOptionActive}` : ''}`}
                      onClick={() => { setSortOption(sortOption === s ? null : s); setSortDropdownOpen(false) }}
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
                <div className={styles.sortDivider} />
                <div className={styles.sortGroup}>
                  <div className={styles.sortGroupLabel}>Sort by</div>
                  {[
                    { key: 'DATE_ADDED', label: 'Date added' },
                    { key: 'RELEASE_YEAR', label: 'Release year' },
                    { key: 'IGDB_SCORE', label: 'IGDB score' },
                    { key: 'YOUR_RATING', label: 'Your rating' },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      className={`${styles.sortOption}${sortOption === key ? ` ${styles.sortOptionActive}` : ''}`}
                      onClick={() => { setSortOption(sortOption === key ? null : key); setSortDropdownOpen(false) }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                {sortOption && (
                  <button
                    className={styles.sortOptionClear}
                    onClick={() => { setSortOption(null); setSortDropdownOpen(false) }}
                  >Clear</button>
                )}
              </div>
            )}
          </div>
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
      </div>

      <div className={styles.filterWrapper}>
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
      </div>

      {loading ? (
        <div className={styles.empty}>Loading...</div>
      ) : displayedLogs.length === 0 ? (
        <div className={styles.empty}>No games here yet.</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {displayedLogs.map(log => (
            <div key={log.id} className={styles.gameCard}>
              <div className={styles.gameCoverWrapper} onClick={() => log.igdbId && navigate(`/games/${log.igdbId}`)}>
                {log.coverUrl
                  ? <img src={log.coverUrl} alt={log.gameTitle} className={styles.coverImg} />
                  : <div className={styles.coverPlaceholder}>{log.gameTitle}</div>
                }
                <div className={`${styles.statusBadge} ${statusClassMap[log.status] ?? ''}`}>
                  {log.status.charAt(0) + log.status.slice(1).toLowerCase()}
                </div>
              </div>
              <div className={styles.gameTitle} onClick={() => log.igdbId && navigate(`/games/${log.igdbId}`)}>{log.gameTitle}</div>
              <div className={styles.gameBottom}>
                <span className={styles.gameRating}>{log.rating ? `${log.rating}/10` : '—'}</span>
                <div className={styles.actionRow}>
                  <button className={styles.actionBtn} onClick={() => openEdit(log)} title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} onClick={() => setConfirmDeleteId(log.id)} title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className={styles.listSection}>
          {displayedLogs.map(log => (
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
              <div className={styles.listRight}>
                <span className={styles.listRating}>{log.rating ? `${log.rating}/10` : '—'}</span>
                <div className={styles.actionRow}>
                  <button className={styles.actionBtn} onClick={() => openEdit(log)} title="Edit">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button className={`${styles.actionBtn} ${styles.actionBtnDelete}`} onClick={() => setConfirmDeleteId(log.id)} title="Delete">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/>
                      <path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Edit modal ── */}
      {editingLog && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeEdit()}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />

            <div className={styles.sheetGame}>
              <div className={styles.sheetThumb}>
                {editingLog.coverUrl && <img src={editingLog.coverUrl} alt={editingLog.gameTitle} className={styles.sheetThumbImg} />}
              </div>
              <div className={styles.sheetGameTitle}>{editingLog.gameTitle}</div>
            </div>

            <div className={styles.sheetLabel}>Status</div>
            <div className={styles.statusRow}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`${styles.statusPill}${editStatus === s ? ` ${styles.statusPillActive}` : ''}`}
                  onClick={() => setEditStatus(s)}
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
                  className={`${styles.ratingBtn}${editRating === n ? ` ${styles.ratingBtnActive}` : ''}`}
                  onClick={() => setEditRating(editRating === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>

            <button className={styles.confirmBtn} onClick={handleEditConfirm} disabled={!editStatus || submitting}>
              {submitting ? 'Saving...' : 'Save changes'}
            </button>
            <button className={styles.cancelBtn} onClick={closeEdit}>Cancel</button>
          </div>
        </div>
      )}

      {/* ── Delete confirmation ── */}
      {confirmDeleteId && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && setConfirmDeleteId(null)}>
          <div className={styles.confirmDialog}>
            <div className={styles.confirmTitle}>Remove from shelf?</div>
            <div className={styles.confirmSub}>
              "{deleteTarget?.gameTitle}" will be permanently removed from your shelf.
            </div>
            <button className={styles.deleteBtn} onClick={handleDeleteConfirm}>Remove</button>
            <button className={styles.cancelBtn} onClick={() => setConfirmDeleteId(null)}>Cancel</button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Shelf

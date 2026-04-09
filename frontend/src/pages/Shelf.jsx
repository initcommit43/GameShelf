import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { logService } from '../services/api'
import Layout from '../components/Layout'
import styles from './Shelf.module.css'

const STATUSES = ['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

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

  const deleteTarget = logs.find(l => l.id === confirmDeleteId)

  return (
    <Layout title="My Shelf">
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
      ) : filteredLogs.length === 0 ? (
        <div className={styles.empty}>No games here yet.</div>
      ) : viewMode === 'grid' ? (
        <div className={styles.grid}>
          {filteredLogs.map(log => (
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

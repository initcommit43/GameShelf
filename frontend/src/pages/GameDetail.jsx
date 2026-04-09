import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gameService, logService } from '../services/api'
import Layout from '../components/Layout'
import styles from './GameDetail.module.css'

const STATUSES = ['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

function GameDetail() {
  const { igdbId } = useParams()
  const navigate = useNavigate()

  const [game, setGame] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isOnShelf, setIsOnShelf] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [toast, setToast] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    Promise.all([
      gameService.getDetails(parseInt(igdbId)),
      logService.getLogs(),
    ]).then(([gameData, logs]) => {
      setGame(gameData)
      setIsOnShelf(logs.some(l => l.igdbId === parseInt(igdbId)))
    }).catch(() => setGame(null))
      .finally(() => setLoading(false))
  }, [igdbId])

  const openSheet = () => {
    setStatus('')
    setRating(null)
    setSheetOpen(true)
  }

  const closeSheet = () => setSheetOpen(false)

  const showToast = (msg, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAdd = async () => {
    if (!status) return
    setSubmitting(true)
    try {
      await logService.addLog({ igdbId: game.igdbId, title: game.title, coverUrl: game.coverUrl, status, rating: rating ?? undefined })
      closeSheet()
      setIsOnShelf(true)
      showToast(`"${game.title}" added to your shelf.`)
    } catch (err) {
      closeSheet()
      showToast(err.message || 'Already on your shelf.', true)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout>
      {loading ? (
        <div className={styles.loading}>Loading...</div>
      ) : !game ? (
        <div className={styles.loading}>Game not found.</div>
      ) : (
        <>
          <div className={styles.topBar}>
            <button className={styles.backBtn} onClick={() => navigate(-1)}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6"/>
              </svg>
              Back
            </button>
            {!isOnShelf && (
              <button className={styles.addBtn} onClick={openSheet}>+ Add to shelf</button>
            )}
            {isOnShelf && <span className={styles.onShelfBadge}>On your shelf</span>}
          </div>

          <div className={styles.hero}>
            <div className={styles.coverWrapper}>
              {game.coverUrl
                ? <img src={game.coverUrl} alt={game.title} className={styles.coverImg} />
                : <div className={styles.coverPlaceholder}>{game.title}</div>
              }
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.title}>{game.title}</h1>
              <div className={styles.metaRow}>
                {game.releaseYear && <span className={styles.metaChip}>{game.releaseYear}</span>}
                {game.rating != null && (
                  <span className={styles.metaChip}>
                    ★ {game.rating.toFixed(1)}<span className={styles.metaChipSub}>/100</span>
                  </span>
                )}
              </div>
              {game.genres?.length > 0 && (
                <div className={styles.chipRow}>
                  {game.genres.map(g => <span key={g} className={styles.genreChip}>{g}</span>)}
                </div>
              )}
              {game.platforms?.length > 0 && (
                <div className={styles.platformList}>
                  {game.platforms.join(' · ')}
                </div>
              )}
            </div>
          </div>

          {game.summary && (
            <div className={styles.section}>
              <div className={styles.sectionLabel}>About</div>
              <p className={styles.summary}>{game.summary}</p>
            </div>
          )}
        </>
      )}

      {sheetOpen && (
        <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && closeSheet()}>
          <div className={styles.sheet}>
            <div className={styles.sheetHandle} />
            <div className={styles.sheetGame}>
              <div className={styles.sheetThumb}>
                {game?.coverUrl && <img src={game.coverUrl} alt={game.title} className={styles.sheetThumbImg} />}
              </div>
              <div className={styles.sheetGameTitle}>{game?.title}</div>
            </div>
            <div className={styles.sheetLabel}>Status</div>
            <div className={styles.statusRow}>
              {STATUSES.map(s => (
                <button
                  key={s}
                  className={`${styles.statusPill}${status === s ? ` ${styles.statusPillActive}` : ''}`}
                  onClick={() => setStatus(s)}
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
                  className={`${styles.ratingBtn}${rating === n ? ` ${styles.ratingBtnActive}` : ''}`}
                  onClick={() => setRating(rating === n ? null : n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button className={styles.confirmBtn} onClick={handleAdd} disabled={!status || submitting}>
              {submitting ? 'Adding...' : 'Add to shelf'}
            </button>
            <button className={styles.cancelBtn} onClick={closeSheet}>Cancel</button>
          </div>
        </div>
      )}

      {toast && (
        <div className={toast.error ? styles.toastError : styles.toastSuccess}>
          {toast.msg}
        </div>
      )}
    </Layout>
  )
}

export default GameDetail

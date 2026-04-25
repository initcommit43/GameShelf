import { useState, useEffect } from 'react'
import styles from './AddToShelfSheet.module.css'

const STATUSES = ['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

function AddToShelfSheet({ game, isOpen, onClose, onConfirm }) {
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setStatus('')
      setRating(null)
    }
  }, [isOpen])

  const handleConfirm = async () => {
    if (!status) return
    setSubmitting(true)
    try {
      await onConfirm(status, rating)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen || !game) return null

  return (
    <div className={styles.overlay} onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className={styles.sheet}>
        <div className={styles.sheetHandle} />

        <div className={styles.sheetGame}>
          <div className={styles.sheetThumb}>
            {game.coverUrl && <img src={game.coverUrl} alt={game.title} className={styles.sheetThumbImg} />}
          </div>
          <div className={styles.sheetGameTitle}>{game.title}</div>
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

        <button className={styles.confirmBtn} onClick={handleConfirm} disabled={!status || submitting}>
          {submitting ? 'Adding...' : 'Add to shelf'}
        </button>
        <button className={styles.cancelBtn} onClick={onClose}>Cancel</button>
      </div>
    </div>
  )
}

export default AddToShelfSheet

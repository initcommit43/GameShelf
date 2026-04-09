import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gameService, logService } from '../services/api'
import Layout from '../components/Layout'
import styles from './Search.module.css'

const STATUSES = ['PLAYING', 'COMPLETED', 'BACKLOG', 'DROPPED', 'WISHLIST']

function Search() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
  const [status, setStatus] = useState('')
  const [rating, setRating] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const debounceRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) navigate('/login')
  }, [])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const data = await gameService.search(query)
        setResults(data)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }, 350)
    return () => clearTimeout(debounceRef.current)
  }, [query])

  const openSheet = (game) => {
    setSelected(game)
    setStatus('')
    setRating(null)
    setSuccessMsg('')
  }

  const closeSheet = () => {
    setSelected(null)
    setStatus('')
    setRating(null)
  }

  const handleConfirm = async () => {
    if (!status) return
    setSubmitting(true)
    try {
      await logService.addLog({ igdbId: selected.igdbId, title: selected.title, coverUrl: selected.coverUrl, status, rating: rating ?? undefined })
      closeSheet()
      setSuccessMsg(`"${selected.title}" added to your shelf.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch (err) {
      setSuccessMsg('Already on your shelf.')
      setTimeout(() => setSuccessMsg(''), 3000)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Search">
      {successMsg && (
        <div className={successMsg === 'Already on your shelf.' ? styles.errorBanner : styles.successBanner}>
          {successMsg}
        </div>
      )}

      <div className={styles.searchBar}>
        <span className={styles.searchIcon}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </span>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search for a game..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
      </div>

      {!query.trim() ? (
        <div className={styles.hint}>Search for games to add to your shelf.</div>
      ) : loading ? (
        <div className={styles.hint}>Searching...</div>
      ) : results.length === 0 ? (
        <div className={styles.hint}>No results for "{query}".</div>
      ) : (
        <div className={styles.grid}>
          {results.map(game => (
            <div key={game.igdbId} className={styles.gameCard}>
              <div className={styles.gameCoverWrapper} onClick={() => navigate(`/games/${game.igdbId}`)}>
                {game.coverUrl
                  ? <img src={game.coverUrl} alt={game.title} className={styles.coverImg} />
                  : <div className={styles.coverPlaceholder}>{game.title}</div>
                }
                <button className={styles.addOverlay} onClick={(e) => { e.stopPropagation(); openSheet(game) }}>+</button>
              </div>
              <div className={styles.gameTitle} onClick={() => navigate(`/games/${game.igdbId}`)}>{game.title}</div>
            </div>
          ))}
        </div>
      )}

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

            <button
              className={styles.confirmBtn}
              onClick={handleConfirm}
              disabled={!status || submitting}
            >
              {submitting ? 'Adding...' : 'Add to shelf'}
            </button>
            <button className={styles.cancelBtn} onClick={closeSheet}>Cancel</button>
          </div>
        </div>
      )}
    </Layout>
  )
}

export default Search

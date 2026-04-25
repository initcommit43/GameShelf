import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { gameService, logService } from '../services/api'
import Layout from '../components/Layout'
import AddToShelfSheet from '../components/AddToShelfSheet/AddToShelfSheet'
import styles from './Search.module.css'

function Search() {
  const [searchParams] = useSearchParams()
  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState(null)
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
    setSuccessMsg('')
  }

  const handleConfirm = async (status, rating) => {
    try {
      await logService.addLog({ igdbId: selected.igdbId, title: selected.title, coverUrl: selected.coverUrl, status, rating: rating ?? undefined })
      setSelected(null)
      setSuccessMsg(`"${selected.title}" added to your shelf.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setSuccessMsg('Already on your shelf.')
      setTimeout(() => setSuccessMsg(''), 3000)
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

      <AddToShelfSheet
        game={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirm}
      />
    </Layout>
  )
}

export default Search

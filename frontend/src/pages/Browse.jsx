import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameService } from '../services/api'
import Layout from '../components/Layout'
import styles from './Browse.module.css'

const SORT_OPTIONS = [
  { label: 'Top Rated', value: 'rating' },
  { label: 'Most Hyped', value: 'hypes' },
  { label: 'Newest', value: 'first_release_date' },
]

function Browse() {
  const navigate = useNavigate()
  const [sort, setSort] = useState('rating')
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    fetchGames(sort, 0, true)
  }, [])

  const fetchGames = async (sortVal, offsetVal, replace = false) => {
    replace ? setLoading(true) : setLoadingMore(true)
    try {
      const data = await gameService.browse(sortVal, offsetVal)
      setGames(prev => replace ? data : [...prev, ...data])
      setOffset(offsetVal + data.length)
      setHasMore(data.length === 24)
    } catch (err) {
      console.error(err)
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }

  const handleSort = (val) => {
    if (val === sort) return
    setSort(val)
    setOffset(0)
    setHasMore(true)
    fetchGames(val, 0, true)
  }

  const handleLoadMore = () => {
    fetchGames(sort, offset, false)
  }

  return (
    <Layout>
      <div className={styles.header}>
        <span className={styles.title}>Browse</span>
      </div>

      <div className={styles.sortBar}>
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            className={`${styles.sortBtn}${sort === opt.value ? ` ${styles.sortBtnActive}` : ''}`}
            onClick={() => handleSort(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 24 }).map((_, i) => (
            <div key={i} className={styles.card}>
              <div className={`${styles.cover} ${styles.coverSkeleton}`} />
              <div className={styles.skeletonTitle} />
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className={styles.grid}>
            {games.map(game => (
              <div key={game.igdbId} className={styles.card} onClick={() => navigate(`/games/${game.igdbId}`)}>
                <div className={styles.cover}>
                  {game.coverUrl
                    ? <img src={game.coverUrl} alt={game.title} className={styles.coverImg} />
                    : <div className={styles.coverPlaceholder}>{game.title}</div>
                  }
                </div>
                <div className={styles.cardTitle}>{game.title}</div>
              </div>
            ))}
          </div>

          {hasMore && (
            <div className={styles.loadMoreWrap}>
              <button className={styles.loadMoreBtn} onClick={handleLoadMore} disabled={loadingMore}>
                {loadingMore ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </>
      )}
    </Layout>
  )
}

export default Browse

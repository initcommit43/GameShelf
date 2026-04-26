import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { gameService, logService } from '../services/api'
import Layout from '../components/Layout'
import AddToShelfSheet from '../components/AddToShelfSheet/AddToShelfSheet'
import styles from './Browse.module.css'

const SORT_OPTIONS = [
  { label: 'Top Rated',  value: 'rating' },
  { label: 'Most Hyped', value: 'hypes' },
  { label: 'Newest',     value: 'first_release_date' },
]

const RECS_PAGE_SIZE = 20

// IGDB genre IDs (most common)
const GENRE_OPTIONS = [
  { label: 'Action',       value: 14 },
  { label: 'Adventure',    value: 31 },
  { label: 'RPG',          value: 12 },
  { label: 'Strategy',     value: 15 },
  { label: 'Shooter',      value: 5  },
  { label: 'Platform',     value: 8  },
  { label: 'Puzzle',       value: 9  },
  { label: 'Fighting',     value: 4  },
  { label: 'Racing',       value: 10 },
  { label: 'Sport',        value: 11 },
  { label: 'Simulation',   value: 13 },
  { label: 'Horror',       value: 19 },
]

// IGDB platform IDs (most common)
const PLATFORM_OPTIONS = [
  { label: 'PC',           value: 6   },
  { label: 'PlayStation 5',value: 167 },
  { label: 'PlayStation 4',value: 48  },
  { label: 'Xbox Series',  value: 169 },
  { label: 'Xbox One',     value: 49  },
  { label: 'Nintendo Switch',value: 130},
  { label: 'iOS',          value: 39  },
  { label: 'Android',      value: 34  },
]

const RATING_OPTIONS = [
  { label: '70+', value: 70 },
  { label: '80+', value: 80 },
  { label: '90+', value: 90 },
]

const currentYear = new Date().getFullYear()
const YEAR_FROM_OPTIONS = [2000, 2005, 2010, 2015, 2018, 2020, 2022, 2023, 2024]
const YEAR_TO_OPTIONS   = [2010, 2015, 2018, 2020, 2022, 2023, 2024, currentYear]

function Browse() {
  const navigate = useNavigate()

  const [showIgdb, setShowIgdbState]  = useState(() => localStorage.getItem('browse_igdb') === 'true')
  const setShowIgdb = (val) => { setShowIgdbState(val); localStorage.setItem('browse_igdb', String(val)) }

  const [sort, setSort]               = useState('rating')
  const [games, setGames]             = useState([])
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [offset, setOffset]           = useState(0)
  const [hasMore, setHasMore]         = useState(true)

  const [filtersOpen, setFiltersOpen] = useState(false)
  const [genreId, setGenreId]         = useState(null)
  const [platformId, setPlatformId]   = useState(null)
  const [minRating, setMinRating]     = useState(null)
  const [yearFrom, setYearFrom]       = useState(null)
  const [yearTo, setYearTo]           = useState(null)

  const sortBarRef = useRef(null)
  useEffect(() => {
    const el = sortBarRef.current
    if (!el) return
    const onWheel = (e) => {
      if (e.deltaY === 0) return
      e.preventDefault()
      el.scrollLeft += e.deltaY
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [])

  const [selected, setSelected]       = useState(null)
  const [successMsg, setSuccessMsg]   = useState('')

  // Track which IGDB IDs are already on the shelf so we can badge them in the grid.
  const [shelfIds, setShelfIds]       = useState(new Set())

  const [category, setCategory]       = useState('browse')
  const [recs, setRecs]               = useState([])
  const [recsLoading, setRecsLoading] = useState(false)
  const [recsFetched, setRecsFetched] = useState(false)
  const [recsVisible, setRecsVisible] = useState(RECS_PAGE_SIZE)

  const activeFilters = { genreId, platformId, minRating, yearFrom, yearTo }
  const hasActiveFilters = Object.values(activeFilters).some(v => v != null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    fetchGames(sort, 0, true, activeFilters)
    logService.getLogs()
      .then(logs => setShelfIds(new Set(logs.map(l => l.igdbId).filter(Boolean))))
      .catch(() => {})
  }, [])

  const fetchGames = async (sortVal, offsetVal, replace = false, filters = {}) => {
    replace ? setLoading(true) : setLoadingMore(true)
    try {
      const data = await gameService.browse(sortVal, offsetVal, filters)
      setGames(prev => replace ? data : [...prev, ...data])
      setOffset(offsetVal + data.length)
      setHasMore(data.length === 24)
    } catch (err) {
      console.error(err)
    } finally {
      replace ? setLoading(false) : setLoadingMore(false)
    }
  }

  const fetchRecs = async () => {
    setRecsLoading(true)
    try {
      const data = await gameService.getRecommendations()
      setRecs(data)
      setRecsFetched(true)
    } catch (err) {
      console.error(err)
      setRecsFetched(true)
    } finally {
      setRecsLoading(false)
    }
  }

  const handleSort = (val) => {
    if (val === sort && category === 'browse') return
    setCategory('browse')
    setSort(val)
    setOffset(0)
    setHasMore(true)
    fetchGames(val, 0, true, activeFilters)
  }

  const handleForYou = () => {
    setCategory('for-you')
    if (!recsFetched) fetchRecs()
  }

  const handleLoadMore = () => fetchGames(sort, offset, false, activeFilters)

  const applyFilters = (patch) => {
    const next = { ...activeFilters, ...patch }
    setGenreId(next.genreId)
    setPlatformId(next.platformId)
    setMinRating(next.minRating)
    setYearFrom(next.yearFrom)
    setYearTo(next.yearTo)
    setOffset(0)
    setHasMore(true)
    setCategory('browse')
    fetchGames(sort, 0, true, next)
  }

  const clearFilters = () => applyFilters({ genreId: null, platformId: null, minRating: null, yearFrom: null, yearTo: null })

  const toggle = (current, value, setter, key) => {
    const next = current === value ? null : value
    setter(next)
    applyFilters({ [key]: next })
  }

  const openSheet = (e, game) => {
    e.stopPropagation()
    setSelected(game)
    setSuccessMsg('')
  }

  const handleConfirm = async (status, rating) => {
    try {
      await logService.addLog({ igdbId: selected.igdbId, title: selected.title, coverUrl: selected.coverUrl, status, rating: rating ?? undefined })
      setShelfIds(prev => new Set(prev).add(selected.igdbId))
      setSelected(null)
      setSuccessMsg(`"${selected.title}" added to your shelf.`)
      setTimeout(() => setSuccessMsg(''), 3000)
    } catch {
      setSelected(null)
      setSuccessMsg('Already on your shelf.')
      setTimeout(() => setSuccessMsg(''), 3000)
    }
  }

  const visibleRecs = recs.slice(0, recsVisible)
  const hasMoreRecs = recsVisible < recs.length

  return (
    <Layout>
      {successMsg && (
        <div className={successMsg.startsWith('Already') ? styles.errorBanner : styles.successBanner}>
          {successMsg}
        </div>
      )}

      <div className={styles.header}>
        <span className={styles.title}>Browse</span>
        <label className={styles.igdbToggle} title="Show IGDB rating">
          <input
            type="checkbox"
            className={styles.igdbToggleInput}
            checked={showIgdb}
            onChange={(e) => setShowIgdb(e.target.checked)}
          />
          <span className={styles.igdbToggleTrack}>
            <span className={styles.igdbToggleThumb} />
          </span>
          <span className={styles.igdbToggleLabel}>IGDB</span>
        </label>
      </div>

      <div
        ref={sortBarRef}
        className={styles.sortBar}
        style={{ overflowX: 'auto', flexWrap: 'nowrap', WebkitOverflowScrolling: 'touch' }}
      >
        {SORT_OPTIONS.map(opt => (
          <button
            key={opt.value}
            style={{ flexShrink: 0 }}
            className={`${styles.sortBtn}${category === 'browse' && sort === opt.value ? ` ${styles.sortBtnActive}` : ''}`}
            onClick={() => handleSort(opt.value)}
          >
            {opt.label}
          </button>
        ))}
        <button
          style={{ flexShrink: 0 }}
          className={`${styles.sortBtn}${category === 'for-you' ? ` ${styles.sortBtnActive}` : ''}`}
          onClick={handleForYou}
        >
          ✦ For You
        </button>

        {category !== 'for-you' && (
          <button
            style={{ flexShrink: 0, marginLeft: 'auto' }}
            className={`${styles.sortBtn} ${styles.filterBtn}${filtersOpen || hasActiveFilters ? ` ${styles.filterBtnActive}` : ''}`}
            onClick={() => setFiltersOpen(v => !v)}
          >
            {hasActiveFilters ? '● Filters' : 'Filters'}
          </button>
        )}
      </div>

      {category !== 'for-you' && filtersOpen && (
        <div className={styles.filterPanel}>
          <div className={styles.filterSection}>
            <div className={styles.filterLabel}>Genre</div>
            <div className={styles.filterPills}>
              {GENRE_OPTIONS.map(g => (
                <button
                  key={g.value}
                  className={`${styles.filterPill}${genreId === g.value ? ` ${styles.filterPillActive}` : ''}`}
                  onClick={() => toggle(genreId, g.value, setGenreId, 'genreId')}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterLabel}>Platform</div>
            <div className={styles.filterPills}>
              {PLATFORM_OPTIONS.map(p => (
                <button
                  key={p.value}
                  className={`${styles.filterPill}${platformId === p.value ? ` ${styles.filterPillActive}` : ''}`}
                  onClick={() => toggle(platformId, p.value, setPlatformId, 'platformId')}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterLabel}>Min Rating</div>
            <div className={styles.filterPills}>
              {RATING_OPTIONS.map(r => (
                <button
                  key={r.value}
                  className={`${styles.filterPill}${minRating === r.value ? ` ${styles.filterPillActive}` : ''}`}
                  onClick={() => toggle(minRating, r.value, setMinRating, 'minRating')}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.filterSection}>
            <div className={styles.filterLabel}>Release Year</div>
            <div className={styles.filterRow}>
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>From</span>
                <div className={styles.filterPills}>
                  {YEAR_FROM_OPTIONS.map(y => (
                    <button
                      key={y}
                      className={`${styles.filterPill}${yearFrom === y ? ` ${styles.filterPillActive}` : ''}`}
                      onClick={() => toggle(yearFrom, y, setYearFrom, 'yearFrom')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
              <div className={styles.filterGroup}>
                <span className={styles.filterGroupLabel}>To</span>
                <div className={styles.filterPills}>
                  {YEAR_TO_OPTIONS.map(y => (
                    <button
                      key={y}
                      className={`${styles.filterPill}${yearTo === y ? ` ${styles.filterPillActive}` : ''}`}
                      onClick={() => toggle(yearTo, y, setYearTo, 'yearTo')}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <button className={styles.clearFilters} onClick={clearFilters}>
              Clear all filters
            </button>
          )}
        </div>
      )}

      {category === 'for-you' ? (
        recsLoading ? (
          <div className={styles.grid}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className={styles.card}>
                <div className={`${styles.cover} ${styles.coverSkeleton}`} />
                <div className={styles.skeletonTitle} />
              </div>
            ))}
          </div>
        ) : recs.length === 0 ? (
          <div className={styles.emptyRecs}>
            <div className={styles.emptyRecsIcon}>✦</div>
            <div className={styles.emptyRecsTitle}>Your shelf is empty</div>
            <div className={styles.emptyRecsSub}>
              Add games to your shelf and we'll recommend titles you'll love.
            </div>
          </div>
        ) : (
          <>
            <div className={styles.grid}>
              {visibleRecs.map(rec => (
                <div
                  key={rec.igdbId}
                  className={styles.card}
                  onClick={() => navigate(`/games/${rec.igdbId}`)}
                >
                  <div className={styles.cover}>
                    {rec.coverUrl
                      ? <img src={rec.coverUrl} alt={rec.title} className={styles.coverImg} />
                      : <div className={styles.coverPlaceholder}>{rec.title}</div>
                    }
                    {showIgdb && rec.igdbRating != null && (
                      <div className={styles.igdbBadge}>★ {Math.round(rec.igdbRating)}</div>
                    )}
                    {shelfIds.has(rec.igdbId)
                      ? <div className={styles.shelvedBadge}>On shelf</div>
                      : <button className={styles.addOverlay} onClick={(e) => openSheet(e, rec)}>+</button>
                    }
                  </div>
                  <div className={styles.cardTitle}>{rec.title}</div>
                </div>
              ))}
            </div>

            {hasMoreRecs && (
              <div className={styles.loadMoreWrap}>
                <button
                  className={styles.loadMoreBtn}
                  onClick={() => setRecsVisible(v => v + RECS_PAGE_SIZE)}
                >
                  Load More
                </button>
              </div>
            )}
          </>
        )
      ) : loading ? (
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
                  {showIgdb && game.igdbRating != null && (
                    <div className={styles.igdbBadge}>★ {Math.round(game.igdbRating)}</div>
                  )}
                  {shelfIds.has(game.igdbId)
                    ? <div className={styles.shelvedBadge}>On shelf</div>
                    : <button className={styles.addOverlay} onClick={(e) => openSheet(e, game)}>+</button>
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
      <AddToShelfSheet
        game={selected}
        isOpen={!!selected}
        onClose={() => setSelected(null)}
        onConfirm={handleConfirm}
      />
    </Layout>
  )
}

export default Browse

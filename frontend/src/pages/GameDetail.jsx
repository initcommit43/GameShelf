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
  const [prices, setPrices] = useState(null)
  const [priceState, setPriceState] = useState('loading') // 'loading' | 'ok' | 'empty' | 'error'

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

  // Prices are fetched independently so the hero renders immediately
  useEffect(() => {
    setPriceState('loading')
    gameService.getPrices(parseInt(igdbId))
      .then(data => {
        setPrices(data)
        const hasContent = data?.bestPrice || data?.offers?.length > 0
        setPriceState(hasContent ? 'ok' : 'empty')
      })
      .catch(() => setPriceState('error'))
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
      await logService.addLog({ igdbId: game.igdbId, title: game.title, coverUrl: game.coverUrl, releaseYear: game.releaseYear, igdbRating: game.rating, status, rating: rating ?? undefined })
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

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Buy</div>

            {priceState === 'loading' && (
              <div className={styles.priceSkeleton}>
                <span className={styles.skeletonBlock} style={{ height: 72, marginBottom: 10 }} />
                <span className={styles.skeletonBlock} style={{ height: 44 }} />
                <span className={styles.skeletonBlock} style={{ height: 44 }} />
              </div>
            )}

            {priceState === 'error' && (
              <p className={styles.priceEmpty}>Price data unavailable.</p>
            )}

            {priceState === 'empty' && (
              <p className={styles.priceEmpty}>No deals found for this game.</p>
            )}

            {priceState === 'ok' && prices && (
              <>
                {/* Best Deal card */}
                {prices.bestPrice && (
                  <div className={styles.bestDeal}>
                    <div className={styles.bestDealLeft}>
                      <span className={styles.bestDealLabel}>Best deal</span>
                      <span className={styles.bestDealPrice}>{prices.bestPrice.price}</span>
                      <span className={styles.bestDealStore}>{prices.bestPrice.store}</span>
                    </div>
                    <a
                      href={prices.bestPrice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.buyBtnPrimary}
                    >
                      Buy
                    </a>
                  </div>
                )}

                {/* Steam reference price */}
                {prices.steamPrice && (
                  <div className={styles.steamRow}>
                    <svg className={styles.steamIcon} viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.52 3.73 10.18 8.84 11.54L12 24l3.16-.46C20.27 22.18 24 17.52 24 12 24 5.37 18.63 0 12 0zm0 4.5a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15z"/>
                    </svg>
                    <span className={styles.steamLabel}>Steam</span>
                    <span className={styles.steamPrice}>{prices.steamPrice.price}</span>
                    {prices.steamPrice.discount > 0 && (
                      <span className={styles.discountBadge}>−{prices.steamPrice.discount}%</span>
                    )}
                    <a
                      href={prices.steamPrice.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.steamLink}
                    >
                      Steam store ↗
                    </a>
                  </div>
                )}

                {/* All offers */}
                {prices.offers?.length > 0 && (
                  <div className={styles.offerTable}>
                    {prices.offers.map((offer, i) => (
                      <div key={i} className={styles.offerRow}>
                        <span className={styles.offerStore}>{offer.storeName}</span>
                        <span className={styles.offerPrice}>{offer.price}</span>
                        {offer.discount > 0
                          ? <span className={styles.offerDiscount}>−{offer.discount}%</span>
                          : <span />
                        }
                        <a
                          href={offer.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.buyBtnSmall}
                        >
                          Buy
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
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

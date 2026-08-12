import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { gameService, logService, reviewService } from '../services/api'
import Layout from '../components/Layout'
import AddToShelfSheet from '../components/AddToShelfSheet/AddToShelfSheet'
import styles from './GameDetail.module.css'
const SORT_OPTIONS = [
  { value: 'newest',         label: 'Newest' },
  { value: 'highest_rating', label: 'Best' },
  { value: 'lowest_rating',  label: 'Worst' },
]

function timeAgo(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const days = Math.floor((Date.now() - d.getTime()) / 86400000)
  if (days < 1) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 30) return `${days}d ago`
  const mo = Math.floor(days / 30)
  if (mo < 12) return `${mo}mo ago`
  return `${Math.floor(mo / 12)}y ago`
}

function ratingColor(n) {
  if (n >= 8) return styles.ratingHigh
  if (n >= 5) return styles.ratingMid
  return styles.ratingLow
}

function ReviewCard({ review, onEdit, onDelete }) {
  const [revealed, setRevealed] = useState(false)
  const hasText = review.reviewText && review.reviewText.trim().length > 0

  return (
    <div className={styles.reviewCard}>
      <div className={styles.reviewHeader}>
        <span className={styles.reviewUsername}>{review.username}</span>
        <span className={`${styles.reviewRatingBadge} ${ratingColor(review.rating)}`}>
          {review.rating}/10
        </span>
        <span className={styles.reviewTime}>{timeAgo(review.createdAt)}</span>
        {review.spoiler && <span className={styles.spoilerTag}>spoiler</span>}
      </div>

      {hasText && (
        review.spoiler && !revealed ? (
          <button className={styles.spoilerReveal} onClick={() => setRevealed(true)}>
            Tap to reveal spoiler
          </button>
        ) : (
          <p className={styles.reviewBody}>{review.reviewText}</p>
        )
      )}

      {review.mine && (
        <div className={styles.reviewCardActions}>
          <button className={styles.reviewCardEdit} onClick={onEdit}>Edit</button>
          <button className={styles.reviewCardDelete} onClick={onDelete}>Delete</button>
        </div>
      )}
    </div>
  )
}

function GameDetail() {
  const { igdbId } = useParams()
  const navigate = useNavigate()

  const [game, setGame]           = useState(null)
  const [loading, setLoading]     = useState(true)
  const [isOnShelf, setIsOnShelf] = useState(false)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [toast, setToast]         = useState(null)
  const [prices, setPrices]       = useState(null)
  const [priceState, setPriceState] = useState('loading')

  // Reviews
  const [reviews, setReviews]             = useState([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [reviewSort, setReviewSort]       = useState('newest')
  const [reviewRating, setReviewRating]   = useState(null)
  const [reviewText, setReviewText]       = useState('')
  const [reviewSpoiler, setReviewSpoiler] = useState(false)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [myReviewId, setMyReviewId]       = useState(null)
  const reviewsInitRef = useRef(false)
  const reviewFormRef  = useRef(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { navigate('/login'); return }
    Promise.all([
      gameService.getDetails(parseInt(igdbId)),
      logService.checkLog(parseInt(igdbId)),
    ]).then(([gameData, check]) => {
      setGame(gameData)
      setIsOnShelf(check.onShelf)
    }).catch(() => setGame(null))
      .finally(() => setLoading(false))
  }, [igdbId])

  useEffect(() => {
    setPriceState('loading')
    gameService.getPrices(parseInt(igdbId))
      .then(data => {
        setPrices(data)
        const hasAnything = data?.bestPrice
          || data?.offers?.length > 0
          || data?.aggregates?.length > 0
        setPriceState(hasAnything ? 'ok' : 'empty')
      })
      .catch(() => setPriceState('error'))
  }, [igdbId])

  useEffect(() => {
    setReviewsLoading(true)
    reviewService.getGameReviews(parseInt(igdbId), reviewSort)
      .then(data => {
        setReviews(data)
        if (!reviewsInitRef.current) {
          reviewsInitRef.current = true
          const mine = data.find(r => r.mine)
          if (mine) {
            setReviewRating(mine.rating)
            setReviewText(mine.reviewText || '')
            setReviewSpoiler(mine.spoiler)
            setMyReviewId(mine.id)
          }
        }
      })
      .catch(console.error)
      .finally(() => setReviewsLoading(false))
  }, [igdbId, reviewSort])

  const degradedProviders = prices?.degradedProviders ?? []

  const openSheet = () => setSheetOpen(true)
  const closeSheet = () => setSheetOpen(false)

  const showToast = (msg, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 3000)
  }

  const handleAdd = async (status, rating) => {
    try {
      await logService.addLog({ igdbId: game.igdbId, title: game.title, coverUrl: game.coverUrl, releaseYear: game.releaseYear, igdbRating: game.rating, status, rating: rating ?? undefined })
      setSheetOpen(false)
      setIsOnShelf(true)
      showToast(`"${game.title}" added to your shelf.`)
    } catch (err) {
      setSheetOpen(false)
      showToast(err.message || 'Already on your shelf.', true)
    }
  }

  const handleSubmitReview = async () => {
    if (!reviewRating) return
    setReviewSubmitting(true)
    try {
      const res = await reviewService.createOrUpdateReview(parseInt(igdbId), {
        rating: reviewRating,
        reviewText: reviewText.trim() || null,
        spoiler: reviewSpoiler,
      })
      setReviews(prev => {
        const idx = prev.findIndex(r => r.mine)
        const next = [...prev]
        if (idx >= 0) { next[idx] = res } else { next.unshift(res) }
        return next
      })
      setMyReviewId(res.id)
      showToast(myReviewId ? 'Review updated.' : 'Review submitted.')
    } catch (err) {
      showToast(err.message || 'Failed to submit review.', true)
    } finally {
      setReviewSubmitting(false)
    }
  }

  const handleDeleteReview = async () => {
    if (!myReviewId) return
    try {
      await reviewService.deleteReview(myReviewId)
      setReviews(prev => prev.filter(r => !r.mine))
      setMyReviewId(null)
      setReviewRating(null)
      setReviewText('')
      setReviewSpoiler(false)
      showToast('Review deleted.')
    } catch (err) {
      showToast(err.message || 'Failed to delete review.', true)
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
                ? <img src={game.coverUrl?.replace('t_cover_big', 't_1080p')} alt={game.title} className={styles.coverImg} />
                : <div className={styles.coverPlaceholder}>{game.title}</div>
              }
            </div>
            <div className={styles.heroInfo}>
              <h1 className={styles.title}>{game.title}</h1>
              <div className={styles.metaRow}>
                {game.releaseYear && <span className={styles.yearChip}>{game.releaseYear}</span>}
                {game.rating != null && (
                  <span className={styles.ratingChip}>
                    <span className={styles.ratingChipStar}>★</span>
                    {game.rating.toFixed(1)}
                    <span className={styles.ratingChipSub}>/100</span>
                  </span>
                )}
              </div>
              {game.genres?.length > 0 && (
                <div className={styles.chipRow}>
                  {game.genres.map(g => <span key={g} className={styles.genreChip}>{g}</span>)}
                </div>
              )}
              {game.platforms?.length > 0 && (
                <div className={styles.platformList}>{game.platforms.join(' · ')}</div>
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
            {priceState === 'error' && <p className={styles.priceEmpty}>Price data unavailable.</p>}
            {priceState === 'empty' && (
              <p className={styles.priceEmpty}>
                {degradedProviders.length > 0
                  ? `No deals found — couldn't reach ${degradedProviders.join(' or ')}.`
                  : 'No deals found for this game.'}
              </p>
            )}
            {priceState === 'ok' && prices && (
              <>
                {prices.bestPrice && (
                  <div className={styles.bestDeal}>
                    <div className={styles.bestDealLeft}>
                      <span className={styles.bestDealLabel}>Best deal</span>
                      <span className={styles.bestDealPrice}>{prices.bestPrice.price}</span>
                      <span className={styles.bestDealStore}>{prices.bestPrice.store}</span>
                    </div>
                    <a href={prices.bestPrice.url} target="_blank" rel="noopener noreferrer" className={styles.buyBtnPrimary}>Buy</a>
                  </div>
                )}
                {prices.offers?.length > 0 && (
                  <div className={styles.offerTable}>
                    {prices.offers.map((offer, i) => (
                      <div key={i} className={styles.offerRow}>
                        <span className={styles.offerStore}>{offer.storeName}</span>
                        <span className={styles.offerPrice}>
                          {offer.price}
                          {offer.discount > 0 && offer.normalPrice && (
                            <span className={styles.offerNormalPrice}>{offer.normalPrice}</span>
                          )}
                        </span>
                        {offer.discount > 0
                          ? <span className={styles.offerDiscount}>−{offer.discount}%</span>
                          : <span />
                        }
                        <a href={offer.url} target="_blank" rel="noopener noreferrer" className={styles.buyBtnSmall}>Buy</a>
                      </div>
                    ))}
                  </div>
                )}

                {prices.aggregates?.length > 0 && (
                  <div className={styles.aggregateBlock}>
                    <div className={styles.aggregateLabel}>Market summary</div>
                    {prices.aggregates.map((agg, i) => (
                      <a
                        key={i}
                        href={agg.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.aggregateRow}
                      >
                        <span className={styles.aggregateName}>{agg.label}</span>
                        <span className={styles.aggregatePrice}>{agg.price}</span>
                      </a>
                    ))}
                  </div>
                )}

                {degradedProviders.length > 0 && (
                  <p className={styles.priceDegraded}>
                    Prices from {degradedProviders.join(' and ')} are temporarily unavailable.
                  </p>
                )}

                {prices.aggregates?.length > 0 && (
                  <p className={styles.priceAttribution}>
                    Market summary by{' '}
                    <a href="https://gg.deals/" target="_blank" rel="noopener noreferrer">GG.deals</a>
                  </p>
                )}
              </>
            )}
          </div>

          <div className={styles.section}>
            <div className={styles.sectionLabel}>Reviews</div>

            {isOnShelf && (
              <div className={styles.reviewForm} ref={reviewFormRef}>
                <div className={styles.reviewFormTitle}>
                  {myReviewId ? 'Your Review' : 'Write a Review'}
                </div>
                <div className={styles.ratingRow}>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                    <button
                      key={n}
                      className={`${styles.ratingBtn}${reviewRating === n ? ` ${styles.ratingBtnActive}` : ''}`}
                      onClick={() => setReviewRating(reviewRating === n ? null : n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <textarea
                  className={styles.reviewTextarea}
                  placeholder="Share your thoughts… (optional)"
                  value={reviewText}
                  onChange={e => setReviewText(e.target.value)}
                  maxLength={1000}
                  rows={3}
                />
                <label className={styles.spoilerLabel}>
                  <input
                    type="checkbox"
                    checked={reviewSpoiler}
                    onChange={e => setReviewSpoiler(e.target.checked)}
                    className={styles.spoilerCheckbox}
                  />
                  <span>Contains spoilers</span>
                </label>
                <div className={styles.reviewFormActions}>
                  <button
                    className={styles.confirmBtn}
                    onClick={handleSubmitReview}
                    disabled={!reviewRating || reviewSubmitting}
                  >
                    {reviewSubmitting ? 'Saving…' : myReviewId ? 'Update Review' : 'Submit Review'}
                  </button>
                  {myReviewId && (
                    <button className={styles.reviewDeleteBtn} onClick={handleDeleteReview}>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            )}

            {!reviewsLoading && reviews.length > 1 && (
              <div className={styles.reviewSortRow}>
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    className={`${styles.sortPill}${reviewSort === opt.value ? ` ${styles.sortPillActive}` : ''}`}
                    onClick={() => setReviewSort(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {reviewsLoading ? (
              <div className={styles.reviewSkeletons}>
                {[0, 1].map(i => (
                  <div key={i} className={styles.reviewSkeleton}>
                    <div className={styles.skeletonLine} style={{ width: '40%', height: 12, marginBottom: 8 }} />
                    <div className={styles.skeletonLine} style={{ width: '90%', height: 10 }} />
                    <div className={styles.skeletonLine} style={{ width: '70%', height: 10, marginTop: 6 }} />
                  </div>
                ))}
              </div>
            ) : reviews.length === 0 ? (
              <div className={styles.reviewsEmpty}>
                {isOnShelf
                  ? 'No reviews yet — be the first to review this game.'
                  : 'No reviews yet.'}
              </div>
            ) : (
              <div className={styles.reviewsList}>
                {reviews.map(r => (
                  <ReviewCard
                    key={r.id}
                    review={r}
                    onEdit={r.mine ? () => reviewFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : undefined}
                    onDelete={r.mine ? handleDeleteReview : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <AddToShelfSheet
        game={game}
        isOpen={sheetOpen}
        onClose={closeSheet}
        onConfirm={handleAdd}
      />

      {toast && (
        <div className={toast.error ? styles.toastError : styles.toastSuccess}>{toast.msg}</div>
      )}
    </Layout>
  )
}

export default GameDetail

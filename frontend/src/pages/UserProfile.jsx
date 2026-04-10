import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { logService, userService } from '../services/api'
import Layout from '../components/Layout'
import styles from './UserProfile.module.css'

const statusClassMap = {
  PLAYING: styles.statusPlaying,
  COMPLETED: styles.statusCompleted,
  BACKLOG: styles.statusBacklog,
  DROPPED: styles.statusDropped,
  WISHLIST: styles.statusWishlist,
}

function UserProfile() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [uploadError, setUploadError] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  const navigate = useNavigate()
  const username = localStorage.getItem('username') ?? 'User'

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      navigate('/login')
      return
    }

    // Load logs and profile in parallel
    Promise.all([
      logService.getLogs(),
      userService.getProfile(),
    ])
      .then(([logsData, profileData]) => {
        setLogs(logsData)
        if (profileData.profilePictureUrl) setAvatarUrl(profileData.profilePictureUrl)
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false))
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('username')
    navigate('/login')
  }

  // Triggered when the user picks a file from the OS dialog
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Client-side pre-validation for immediate feedback
    const allowed = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setUploadError('Only JPG, PNG, and WebP images are accepted.')
      return
    }
    if (file.size > 3 * 1024 * 1024) {
      setUploadError('Image must be 3 MB or less.')
      return
    }

    // Show an instant local preview while the upload is in flight
    const localPreview = URL.createObjectURL(file)
    setAvatarUrl(localPreview)
    setUploadError('')
    setUploading(true)

    try {
      const data = await userService.uploadProfilePicture(file)
      // Replace the temporary blob URL with the permanent server URL
      URL.revokeObjectURL(localPreview)
      setAvatarUrl(data.profilePictureUrl)
    } catch (err) {
      URL.revokeObjectURL(localPreview)
      setAvatarUrl(null)
      setUploadError(err.message || 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
      // Reset so the same file can be picked again if needed
      e.target.value = ''
    }
  }

  const total = logs.length
  const completed = logs.filter(l => l.status === 'COMPLETED').length
  const playing = logs.filter(l => l.status === 'PLAYING').length
  const rated = logs.filter(l => l.rating)
  const avgRating = rated.length > 0
    ? (rated.reduce((sum, l) => sum + l.rating, 0) / rated.length).toFixed(1)
    : '—'

  const recent = [...logs].sort((a, b) => b.id - a.id).slice(0, 5)

  return (
    <Layout title="Profile">
      <div className={styles.heroGlow} />

      <section className={styles.avatarSection}>
        {/* Hidden native file input — triggered by clicking the avatar ring */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className={styles.fileInputHidden}
          onChange={handleFileChange}
        />

        {/* Clicking the avatar opens the file picker */}
        <button
          className={styles.avatarBtn}
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Change profile picture"
        >
          <div className={styles.avatarRing}>
            <div className={styles.avatarInner}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className={styles.avatarImg} />
              ) : (
                <span className={styles.avatarLetter}>{username[0]}</span>
              )}
            </div>
          </div>

          {/* Upload overlay — shows a camera icon on hover / during upload */}
          <div className={`${styles.avatarOverlay} ${uploading ? styles.avatarOverlayActive : ''}`}>
            {uploading ? (
              <span className={styles.avatarSpinner} />
            ) : (
              <span className={styles.avatarCameraIcon}>📷</span>
            )}
          </div>
        </button>

        <div className={styles.userName}>{username}</div>
        <div className={styles.userMeta}>{total} games logged</div>

        {uploadError && (
          <p className={styles.uploadError}>{uploadError}</p>
        )}
      </section>

      <section className={styles.statsGrid}>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>▤</span>
          <div className={styles.statValue}>{loading ? '—' : total}</div>
          <div className={styles.statLabel}>Total Games</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconGreen}`}>✓</span>
          <div className={styles.statValue}>{loading ? '—' : completed}</div>
          <div className={styles.statLabel}>Completed</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconAmber}`}>▶</span>
          <div className={styles.statValue}>{loading ? '—' : playing}</div>
          <div className={styles.statLabel}>Playing</div>
        </div>
        <div className={styles.statCard}>
          <span className={`${styles.statIcon} ${styles.statIconBlue}`}>★</span>
          <div className={styles.statValue}>{loading ? '—' : avgRating}</div>
          <div className={styles.statLabel}>Avg Rating</div>
        </div>
      </section>

      <section>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Recent Activity</span>
        </div>

        {loading ? (
          <div className={styles.emptyActivity}>Loading...</div>
        ) : recent.length === 0 ? (
          <div className={styles.emptyActivity}>No activity yet. Start adding games!</div>
        ) : (
          <div className={styles.activityList}>
            {recent.map(log => (
              <div key={log.id} className={styles.activityRow}>
                <div className={styles.activityThumb}>
                  {log.coverUrl
                    ? <img src={log.coverUrl} alt={log.gameTitle} className={styles.activityThumbImg} />
                    : <div className={styles.activityThumbPlaceholder}>{log.gameTitle}</div>
                  }
                </div>
                <div className={styles.activityInfo}>
                  <div className={styles.activityTitle}>{log.gameTitle}</div>
                  <div className={styles.activityMeta}>
                    <span className={`${styles.activityStatus} ${statusClassMap[log.status] ?? ''}`}>
                      {log.status.charAt(0) + log.status.slice(1).toLowerCase()}
                    </span>
                    {log.rating && (
                      <>
                        <span className={styles.activityDot}>·</span>
                        <span className={styles.activityRating}>{log.rating}/10</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className={styles.actions}>
        <button className={styles.logoutBtn} onClick={handleLogout}>Sign out</button>
      </section>
    </Layout>
  )
}

export default UserProfile

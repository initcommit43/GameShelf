import { useNavigate, useLocation } from 'react-router-dom'
import styles from './BottomNav.module.css'

function BottomNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav}>
      <button
        className={`${styles.tab} ${pathname === '/search' ? styles.tabActive : ''}`}
        onClick={() => navigate('/search')}
      >
        <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <span className={styles.tabLabel}>Search</span>
      </button>

      <button
        className={`${styles.tab} ${pathname === '/browse' ? styles.tabActive : ''}`}
        onClick={() => navigate('/browse')}
      >
        <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
        <span className={styles.tabLabel}>Browse</span>
      </button>

      <button
        className={`${styles.tab} ${pathname === '/shelf' ? styles.tabActive : ''}`}
        onClick={() => navigate('/shelf')}
      >
        <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
        </svg>
        <span className={styles.tabLabel}>Shelf</span>
      </button>

      <button
        className={`${styles.tab} ${pathname === '/profile' ? styles.tabActive : ''}`}
        onClick={() => navigate('/profile')}
      >
        <svg className={styles.tabIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
        </svg>
        <span className={styles.tabLabel}>Profile</span>
      </button>
    </nav>
  )
}

export default BottomNav

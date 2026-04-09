import { useNavigate, useLocation } from 'react-router-dom'
import styles from './SideNav.module.css'

const NAV_ITEMS = [
  {
    path: '/search',
    label: 'Search',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
    ),
  },
  {
    path: '/shelf',
    label: 'My Shelf',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    path: '/profile',
    label: 'Profile',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
]

function SideNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  return (
    <nav className={styles.nav}>
      <div className={styles.inner}>
        <span className={styles.logo} onClick={() => navigate('/')}>GameShelf</span>

        <div className={styles.items}>
          {NAV_ITEMS.map(item => (
            <button
              key={item.path}
              className={`${styles.item} ${pathname === item.path ? styles.itemActive : ''}`}
              onClick={() => navigate(item.path)}
            >
              <span className={styles.icon}>{item.icon}</span>
              <span className={styles.label}>{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}

export default SideNav

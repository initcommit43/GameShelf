import SideNav from './SideNav'
import BottomNav from './BottomNav'
import styles from './Layout.module.css'

function Layout({ children, title }) {
  return (
    <div className={styles.shell}>
      <SideNav />

      {title && (
        <header className={styles.mobileHeader}>
          <span className={styles.mobileTitle}>{title}</span>
        </header>
      )}

      <main className={styles.main}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}

export default Layout

import SideNav from './SideNav'
import BottomNav from './BottomNav'
import styles from './Layout.module.css'

function Layout({ children }) {
  return (
    <div className={styles.shell}>
      <SideNav />

      <header className={styles.mobileHeader}>
        <span className={styles.mobileTitle}>GameShelf</span>
      </header>

      <main className={styles.main}>
        {children}
      </main>

      <BottomNav />
    </div>
  )
}

export default Layout

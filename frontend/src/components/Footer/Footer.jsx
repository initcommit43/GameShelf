import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerBottom}>
          <div className={styles.footerLeft}>
            <div className={styles.footerLinks}>
              <Link to="/privacy" className={styles.footerLink}>Privacy Policy</Link>
              <Link to="/impressum" className={styles.footerLink}>Impressum</Link>
              <Link to="/roadmap" className={styles.footerLink}>Roadmap</Link>
            </div>
            <p className={styles.footerPowered}>
              Powered by{' '}
              <a href="https://www.igdb.com" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>IGDB</a>
              {' '}and{' '}
              <a href="https://gg.deals" target="_blank" rel="noopener noreferrer" className={styles.footerLink}>GG.deals</a>
            </p>
          </div>
          <p className={styles.footerCopyright}>© 2026 GameShelf</p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

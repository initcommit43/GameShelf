import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { authService } from '../services/api'

function Register() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const data = await authService.register(username, email, password)
      localStorage.setItem('token', data.token)
      localStorage.setItem('username', data.username)
      navigate('/shelf')
    } catch (err) {
      setError('Registration failed. Username or email may already be taken.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>GameShelf</h1>
        <p style={styles.subtitle}>Create your account.</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </button>
        </form>

        <p style={styles.link}>
          Already have an account? <Link to="/login" style={styles.linkText}>Sign in</Link>
        </p>
      </div>
    </div>
  )
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '24px',
  },
  card: {
    background: '#16161d',
    border: '0.5px solid #2a2a35',
    borderRadius: '12px',
    padding: '40px 36px',
    width: '100%',
    maxWidth: '400px',
  },
  logo: {
    fontSize: '24px',
    fontWeight: '500',
    color: '#378ADD',
    marginBottom: '8px',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: '14px',
    color: '#666677',
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  input: {
    background: '#1e1e28',
    border: '0.5px solid #2a2a35',
    borderRadius: '8px',
    padding: '12px 14px',
    fontSize: '14px',
    color: '#e2e2e8',
    outline: 'none',
    width: '100%',
  },
  button: {
    background: '#185FA5',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#fff',
    cursor: 'pointer',
    marginTop: '4px',
  },
  error: {
    fontSize: '13px',
    color: '#F09595',
    textAlign: 'center',
  },
  link: {
    fontSize: '13px',
    color: '#666677',
    textAlign: 'center',
    marginTop: '20px',
  },
  linkText: {
    color: '#378ADD',
  },
}

export default Register
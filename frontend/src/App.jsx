import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<div>Register</div>} />
      <Route path="/shelf" element={<div>Shelf</div>} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App
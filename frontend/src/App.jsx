import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Shelf from './pages/Shelf'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/shelf" element={<Shelf />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App
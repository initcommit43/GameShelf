import { Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Shelf from './pages/Shelf'
import Search from './pages/Search'
import UserProfile from './pages/UserProfile'
import GameDetail from './pages/GameDetail'
import Browse from './pages/Browse'
import News from './pages/News'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/shelf" element={<Shelf />} />
      <Route path="/search" element={<Search />} />
      <Route path="/profile" element={<UserProfile />} />
      <Route path="/browse" element={<Browse />} />
      <Route path="/news" element={<News />} />
      <Route path="/games/:igdbId" element={<GameDetail />} />
      <Route path="*" element={<Navigate to="/login" />} />
    </Routes>
  )
}

export default App

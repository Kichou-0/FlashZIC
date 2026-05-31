import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { PlayerProvider } from './contexts/PlayerContext'
import Sidebar from './components/Sidebar'
import PlayerBar from './components/PlayerBar'
import AuthPage from './pages/AuthPage'
import HomePage from './pages/HomePage'
import UploadPage from './pages/UploadPage'
import PlaylistsPage from './pages/PlaylistsPage'
import ProfilePage from './pages/ProfilePage'
import ListenTogetherPage from './pages/ListenTogetherPage'
import './styles.css'

function AppLayout() {
  const { user, loading } = useAuth()
  if (loading) return <div className="full-loading"><div className="spinner large" /><p>FlashZIC</p></div>
  if (!user) return <AuthPage />

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/playlists" element={<PlaylistsPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/listen" element={<ListenTogetherPage />} />
          <Route path="/listen/:sessionId" element={<ListenTogetherPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
      <PlayerBar />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <PlayerProvider>
          <AppLayout />
        </PlayerProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}

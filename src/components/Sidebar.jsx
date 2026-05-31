import { NavLink } from 'react-router-dom'
import { Home, Upload, ListMusic, User } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

export default function Sidebar() {
  const { profile } = useAuth()

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="logo-flash">Flash</span><span className="logo-zic">ZIC</span>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <Home size={20} /> <span>Accueil</span>
        </NavLink>
        <NavLink to="/playlists" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <ListMusic size={20} /> <span>Playlists</span>
        </NavLink>
        <NavLink to="/upload" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <Upload size={20} /> <span>Upload</span>
        </NavLink>
        <NavLink to="/listen" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
          <Headphones size={20} /> <span>Écoute ensemble</span>
        </NavLink>

      </nav>

      {profile && (
        <NavLink to="/profile" className="sidebar-user">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="avatar" className="sidebar-avatar-img" />
         ) : (
        <div className="sidebar-avatar">{profile.username?.[0]?.toUpperCase()}</div>
           )}
        <span>{profile.username}</span>
       </NavLink>
      )}
    </aside>
  )
}

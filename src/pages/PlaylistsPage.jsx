import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TrackCard from '../components/TrackCard'
import { Plus, X, Music } from 'lucide-react'

export default function PlaylistsPage() {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [active, setActive] = useState(null)
  const [tracks, setTracks] = useState([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlaylists()
  }, [])

  async function fetchPlaylists() {
    const { data } = await supabase
      .from('playlists').select('*')
      .eq('user_id', user.id).order('created_at', { ascending: false })
    setPlaylists(data || [])
    setLoading(false)
  }

  async function openPlaylist(pl) {
    setActive(pl)
    const { data } = await supabase
      .from('playlist_tracks').select('tracks(*)')
      .eq('playlist_id', pl.id).order('added_at')
    setTracks(data?.map(r => r.tracks) || [])
  }

  async function createPlaylist(e) {
    e.preventDefault()
    if (!newName.trim()) return
    const { data } = await supabase.from('playlists')
      .insert({ name: newName, user_id: user.id }).select().single()
    setPlaylists(p => [data, ...p])
    setNewName('')
    setShowCreate(false)
  }

  async function removeFromPlaylist(trackId) {
    await supabase.from('playlist_tracks')
      .delete().eq('playlist_id', active.id).eq('track_id', trackId)
    setTracks(t => t.filter(tr => tr.id !== trackId))
  }

  return (
    <div className="page playlists-page">
      {!active ? (
        <>
          <div className="page-header">
            <h1>Mes Playlists</h1>
            <button className="btn-primary small" onClick={() => setShowCreate(true)}>
              <Plus size={16} /> Créer
            </button>
          </div>

          {showCreate && (
            <form onSubmit={createPlaylist} className="create-playlist-form">
              <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Nom de la playlist" autoFocus />
              <button type="submit" className="btn-primary small">Créer</button>
              <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost small"><X size={16} /></button>
            </form>
          )}

          {loading ? <div className="loading"><div className="spinner" /></div> : (
            playlists.length === 0 ? (
              <div className="empty-state">
                <Music size={48} />
                <p>Aucune playlist. Crée-en une !</p>
              </div>
            ) : (
              <div className="playlists-grid">
                {playlists.map(pl => (
                  <div key={pl.id} className="playlist-card" onClick={() => openPlaylist(pl)}>
                    <div className="playlist-art">🎵</div>
                    <div>
                      <p className="playlist-name">{pl.name}</p>
                      <p className="playlist-meta">Playlist</p>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </>
      ) : (
        <>
          <div className="page-header">
            <button className="btn-ghost" onClick={() => setActive(null)}>← Retour</button>
            <h1>{active.name}</h1>
          </div>
          {tracks.length === 0 ? (
            <div className="empty-state">
              <p>Playlist vide. Ajoute des sons depuis l'accueil !</p>
            </div>
          ) : (
            <div className="tracks-list">
              {tracks.map(t => (
                <div key={t.id} className="track-list-item">
                  <TrackCard track={t} trackList={tracks} />
                  <button className="icon-btn danger" onClick={() => removeFromPlaylist(t.id)} title="Retirer">
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { X, Plus, Check } from 'lucide-react'

export default function AddToPlaylistModal({ track, onClose }) {
  const { user } = useAuth()
  const [playlists, setPlaylists] = useState([])
  const [added, setAdded] = useState({})
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    fetchPlaylists()
  }, [])

  async function fetchPlaylists() {
    const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id)
    setPlaylists(data || [])
  }

  async function addToPlaylist(playlist) {
    const { error } = await supabase.from('playlist_tracks').insert({
      playlist_id: playlist.id,
      track_id: track.id,
    })
    if (!error) setAdded(a => ({ ...a, [playlist.id]: true }))
  }

  async function createAndAdd(e) {
    e.preventDefault()
    if (!newName.trim()) return
    setCreating(true)
    const { data } = await supabase.from('playlists')
      .insert({ name: newName, user_id: user.id }).select().single()
    if (data) {
      setPlaylists(p => [...p, data])
      await addToPlaylist(data)
      setNewName('')
    }
    setCreating(false)
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Ajouter à une playlist</h3>
          <button className="icon-btn" onClick={onClose}><X size={18} /></button>
        </div>
        <p className="modal-track-name">🎵 {track.title}</p>

        <div className="modal-playlists">
          {playlists.length === 0 && <p className="empty">Aucune playlist. Crée-en une !</p>}
          {playlists.map(pl => (
            <div key={pl.id} className="modal-playlist-row">
              <span>{pl.name}</span>
              <button
                className={`btn-primary small ${added[pl.id] ? 'added' : ''}`}
                onClick={() => addToPlaylist(pl)}
                disabled={added[pl.id]}>
                {added[pl.id] ? <><Check size={14} /> Ajouté</> : <><Plus size={14} /> Ajouter</>}
              </button>
            </div>
          ))}
        </div>

        <form onSubmit={createAndAdd} className="modal-create">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Nouvelle playlist..."
          />
          <button type="submit" className="btn-primary small" disabled={creating}>
            <Plus size={14} /> Créer
          </button>
        </form>
      </div>
    </div>
  )
}

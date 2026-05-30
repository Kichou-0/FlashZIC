import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TrackCard from '../components/TrackCard'
import { Trash2, LogOut } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, signOut } = useAuth()
  const [myTracks, setMyTracks] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMyTracks()
  }, [])

  async function fetchMyTracks() {
    const { data } = await supabase.from('tracks').select('*')
      .eq('uploaded_by', user.id).order('created_at', { ascending: false })
    setMyTracks(data || [])
    setLoading(false)
  }

  async function deleteTrack(track) {
    if (!confirm(`Supprimer "${track.title}" ?`)) return
    await supabase.from('tracks').delete().eq('id', track.id)
    setMyTracks(t => t.filter(tr => tr.id !== track.id))
  }

  return (
    <div className="page profile-page">
      <div className="profile-header">
        <div className="avatar">{profile?.username?.[0]?.toUpperCase() || '?'}</div>
        <div>
          <h2>{profile?.username || 'Artiste'}</h2>
          <p className="profile-email">{user?.email}</p>
          <p className="profile-stats">{myTracks.length} son{myTracks.length !== 1 ? 's' : ''} uploadé{myTracks.length !== 1 ? 's' : ''}</p>
        </div>
        <button className="btn-ghost danger" onClick={signOut}><LogOut size={16} /> Déconnexion</button>
      </div>

      <section>
        <h2 className="section-title">🎵 Mes Sons</h2>
        {loading ? <div className="loading"><div className="spinner" /></div> : (
          myTracks.length === 0 ? (
            <div className="empty-state">
              <p>Tu n'as rien uploadé encore. Lance-toi !</p>
            </div>
          ) : (
            <div className="tracks-list">
              {myTracks.map(t => (
                <div key={t.id} className="track-list-item">
                  <TrackCard track={t} trackList={myTracks} />
                  <button className="icon-btn danger" onClick={() => deleteTrack(t)} title="Supprimer">
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          )
        )}
      </section>
    </div>
  )
}

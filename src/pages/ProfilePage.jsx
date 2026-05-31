import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import TrackCard from '../components/TrackCard'
import { Trash2, LogOut, Camera, Check, X, Pencil } from 'lucide-react'

export default function ProfilePage() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const [myTracks, setMyTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const avatarInputRef = useRef()

  useEffect(() => {
    fetchMyTracks()
    if (profile?.avatar_url) setAvatarUrl(profile.avatar_url)
  }, [profile])

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

  async function saveUsername() {
    if (!newUsername.trim()) return
    if (newUsername.trim().length < 2) { setUsernameError('Minimum 2 caractères'); return }
    setSavingUsername(true)
    setUsernameError('')
    const { error } = await supabase.from('profiles')
      .update({ username: newUsername.trim() })
      .eq('id', user.id)
    if (error) {
      setUsernameError(error.message.includes('unique') ? 'Ce pseudo est déjà pris' : error.message)
    } else {
      await fetchProfile(user.id)
      setEditingUsername(false)
      setUsernameSuccess(true)
      setTimeout(() => setUsernameSuccess(false), 2000)
    }
    setSavingUsername(false)
  }

  async function handleAvatarChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setUploadingAvatar(true)
    const ext = file.name.split('.').pop()
    const path = `avatars/${user.id}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('tracks')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('tracks').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl + '?t=' + Date.now())
      await fetchProfile(user.id)
    }
    setUploadingAvatar(false)
  }

  return (
    <div className="page profile-page">
      <div className="profile-header">
        {/* Avatar */}
        <div className="avatar-wrapper" onClick={() => avatarInputRef.current.click()}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="avatar" className="avatar-img" />
          ) : (
            <div className="avatar">{profile?.username?.[0]?.toUpperCase() || '?'}</div>
          )}
          <div className="avatar-overlay">
            {uploadingAvatar ? <div className="spinner small" /> : <Camera size={18} />}
          </div>
          <input ref={avatarInputRef} type="file" accept="image/*" onChange={handleAvatarChange} hidden />
        </div>

        {/* Infos */}
        <div className="profile-info">
          {editingUsername ? (
            <div className="username-edit">
              <input
                value={newUsername}
                onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
                placeholder="Nouveau pseudo"
                autoFocus
                className="username-input"
              />
              <button className="icon-btn" onClick={saveUsername} disabled={savingUsername}>
                <Check size={16} color="#4ade80" />
              </button>
              <button className="icon-btn" onClick={() => { setEditingUsername(false); setUsernameError('') }}>
                <X size={16} color="#ef4444" />
              </button>
            </div>
          ) : (
            <div className="username-row">
              <h2>{profile?.username || 'Artiste'}</h2>
              <button className="icon-btn" onClick={() => { setNewUsername(profile?.username || ''); setEditingUsername(true) }} title="Modifier le pseudo">
                <Pencil size={14} color="#888" />
              </button>
              {usernameSuccess && <span className="success-text">✅ Sauvegardé !</span>}
            </div>
          )}
          {usernameError && <p className="username-error">{usernameError}</p>}
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

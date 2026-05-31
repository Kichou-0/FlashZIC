import { useEffect, useState, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { Trash2, LogOut, Camera, Check, X, Pencil, Save } from 'lucide-react'
import { GENRES } from '../lib/supabase'

export default function ProfilePage() {
  const { user, profile, signOut, fetchProfile } = useAuth()
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer()
  const [myTracks, setMyTracks] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingUsername, setEditingUsername] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [usernameError, setUsernameError] = useState('')
  const [usernameSuccess, setUsernameSuccess] = useState(false)
  const [editingTrack, setEditingTrack] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editArtist, setEditArtist] = useState('')
  const [editGenre, setEditGenre] = useState('')
  const [savingTrack, setSavingTrack] = useState(false)
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
    const { error } = await supabase.from('profiles').update({ username: newUsername.trim() }).eq('id', user.id)
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
    const { error: uploadErr } = await supabase.storage.from('tracks').upload(path, file, { upsert: true, contentType: file.type })
    if (!uploadErr) {
      const { data: { publicUrl } } = supabase.storage.from('tracks').getPublicUrl(path)
      await supabase.from('profiles').update({ avatar_url: publicUrl }).eq('id', user.id)
      setAvatarUrl(publicUrl + '?t=' + Date.now())
      await fetchProfile(user.id)
    }
    setUploadingAvatar(false)
  }

  function startEditTrack(track) {
    setEditingTrack(track.id)
    setEditTitle(track.title)
    setEditArtist(track.artist)
    setEditGenre(track.genre)
  }

  async function saveTrack(trackId) {
    setSavingTrack(true)
    const { error } = await supabase.from('tracks').update({
      title: editTitle,
      artist: editArtist,
      genre: editGenre,
    }).eq('id', trackId)
    if (!error) {
      setMyTracks(t => t.map(tr => tr.id === trackId ? { ...tr, title: editTitle, artist: editArtist, genre: editGenre } : tr))
      setEditingTrack(null)
    }
    setSavingTrack(false)
  }

  return (
    <div className="page profile-page">
      <div className="profile-header">
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

        <div className="profile-info">
          {editingUsername ? (
            <div className="username-edit">
              <input value={newUsername} onChange={e => setNewUsername(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') saveUsername(); if (e.key === 'Escape') setEditingUsername(false) }}
                placeholder="Nouveau pseudo" autoFocus className="username-input" />
              <button className="icon-btn" onClick={saveUsername} disabled={savingUsername}><Check size={16} color="#4ade80" /></button>
              <button className="icon-btn" onClick={() => { setEditingUsername(false); setUsernameError('') }}><X size={16} color="#ef4444" /></button>
            </div>
          ) : (
            <div className="username-row">
              <h2>{profile?.username || 'Artiste'}</h2>
              <button className="icon-btn" onClick={() => { setNewUsername(profile?.username || ''); setEditingUsername(true) }}><Pencil size={14} color="#888" /></button>
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
            <div className="empty-state"><p>Tu n'as rien uploadé encore. Lance-toi !</p></div>
          ) : (
            <div className="my-tracks-list">
              {myTracks.map(t => {
                const genre = GENRES.find(g => g.id === t.genre)
                const isActive = currentTrack?.id === t.id
                return (
                  <div key={t.id} className={`my-track-item ${isActive ? 'active' : ''}`}>
                    {editingTrack === t.id ? (
                      <div className="track-edit-form">
                        <div className="track-edit-cover" style={{
                          backgroundImage: t.cover_url ? `url(${t.cover_url})` : 'none',
                          backgroundColor: genre?.color + '33'
                        }}>
                          {!t.cover_url && <span>{genre?.emoji || '🎵'}</span>}
                        </div>
                        <div className="track-edit-fields">
                          <input value={editTitle} onChange={e => setEditTitle(e.target.value)} placeholder="Titre" className="track-edit-input" />
                          <input value={editArtist} onChange={e => setEditArtist(e.target.value)} placeholder="Artiste" className="track-edit-input" />
                          <div className="genre-picker">
                            {GENRES.map(g => (
                              <button type="button" key={g.id}
                                className={`genre-btn ${editGenre === g.id ? 'active' : ''}`}
                                style={{ '--genre-color': g.color }}
                                onClick={() => setEditGenre(g.id)}>
                                {g.emoji} {g.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="track-edit-actions">
                          <button className="btn-primary small" onClick={() => saveTrack(t.id)} disabled={savingTrack}>
                            <Save size={14} /> {savingTrack ? '...' : 'Sauver'}
                          </button>
                          <button className="btn-ghost small" onClick={() => setEditingTrack(null)}><X size={14} /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="my-track-cover" style={{
                          backgroundImage: t.cover_url ? `url(${t.cover_url})` : 'none',
                          backgroundColor: genre?.color + '33'
                        }} onClick={() => isActive ? togglePlay() : playTrack(t, myTracks)}>
                          {!t.cover_url && <span>{genre?.emoji || '🎵'}</span>}
                        </div>
                        <div className="my-track-info">
                          <p className="track-title">{t.title}</p>
                          <p className="track-artist">{t.artist}</p>
                          {genre && <span className="genre-tag" style={{ background: genre.color + '22', color: genre.color }}>{genre.emoji} {genre.label}</span>}
                        </div>
                        <div className="my-track-actions">
                          <button className="icon-btn" onClick={() => startEditTrack(t)} title="Modifier"><Pencil size={15} /></button>
                          <button className="icon-btn danger" onClick={() => deleteTrack(t)} title="Supprimer"><Trash2 size={15} /></button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )
        )}
      </section>
    </div>
  )
}

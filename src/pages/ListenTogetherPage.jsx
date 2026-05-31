import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { Play, Pause, SkipForward, SkipBack, Users, Copy, Check, Music, LogOut, Plus, Hash } from 'lucide-react'
import { GENRES } from '../lib/supabase'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function ListenTogetherPage() {
  const { sessionId } = useParams()
  const { user, profile } = useAuth()
  const { currentTrack, isPlaying, currentTime, duration, playTrack, togglePlay, skipNext, skipPrev, seek, audioRef } = usePlayer()
  const navigate = useNavigate()

  const [screen, setScreen] = useState('lobby') // lobby | session
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [session, setSession] = useState(null)
  const [members, setMembers] = useState([])
  const [tracks, setTracks] = useState([])
  const [copied, setCopied] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(false)
  const channelRef = useRef(null)
  const syncInterval = useRef(null)
  const isHostRef = useRef(false)

  useEffect(() => {
    fetchTracks()
    if (sessionId) {
      handleJoinById(sessionId)
    }
    return () => { cleanup() }
  }, [])

  async function fetchTracks() {
    const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false })
    setTracks(data || [])
  }

  async function cleanup() {
    if (channelRef.current) await supabase.removeChannel(channelRef.current)
    if (syncInterval.current) clearInterval(syncInterval.current)
  }

  async function createSession() {
    setLoading(true)
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('listen_sessions').insert({
      id,
      host_id: user.id,
      track_id: null,
      is_playing: false,
      position: 0,
    }).select().single()
    if (error) { console.error(error); setLoading(false); return }
    setSession(data)
    setIsHost(true)
    isHostRef.current = true
    navigate(`/listen/${id}`, { replace: true })
    subscribeToSession(id, true)
    setScreen('session')
    setLoading(false)
  }

  async function handleJoinById(id) {
    setLoading(true)
    setJoinError('')
    const code = id.toUpperCase().trim()
    const { data, error } = await supabase.from('listen_sessions').select('*').eq('id', code).single()
    if (error || !data) { setJoinError('Session introuvable'); setLoading(false); return }
    const host = data.host_id === user.id
    setSession(data)
    setIsHost(host)
    isHostRef.current = host
    subscribeToSession(code, host)

    if (data.track_id) {
      const { data: track } = await supabase.from('tracks').select('*').eq('id', data.track_id).single()
      if (track) {
        playTrack(track, tracks.length ? tracks : [track])
        setTimeout(() => { seek(data.position || 0) }, 800)
      }
    }
    navigate(`/listen/${code}`, { replace: true })
    setScreen('session')
    setLoading(false)
  }

  async function handleJoinByCode(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    await handleJoinById(joinCode)
  }

  function subscribeToSession(id, host) {
    const channel = supabase.channel(`listen:${id}`, { config: { presence: { key: user.id } } })
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const all = Object.values(state).flat()
        setMembers(all)
        // Auto-delete session if empty
        if (all.length === 0) {
          supabase.from('listen_sessions').delete().eq('id', id)
        }
      })
      .on('broadcast', { event: 'player_update' }, ({ payload }) => {
        if (payload.user_id === user.id) return
        handleRemoteUpdate(payload)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile?.username || user?.email?.split('@')[0] || 'Inconnu',
            avatar: profile?.avatar_url || null,
          })
        }
      })
    channelRef.current = channel

    if (host) {
      syncInterval.current = setInterval(() => {
        if (channelRef.current) {
          channelRef.current.send({
            type: 'broadcast',
            event: 'player_update',
            payload: { type: 'sync', position: currentTime, user_id: user.id }
          })
        }
      }, 3000)
    }
  }

  async function handleRemoteUpdate(payload) {
  if (payload.type === 'play_track') {
    const { data: track } = await supabase.from('tracks').select('*').eq('id', payload.track_id).single()
    if (track) {
      playTrack(track, tracks.length ? tracks : [track])
      setTimeout(() => seek(payload.position || 0), 500)
    }
  } else if (payload.type === 'play') {
  audioRef.current.play().catch(() => {})
} else if (payload.type === 'pause') {
  audioRef.current.pause()
}
  } else if (payload.type === 'sync') {
    const diff = Math.abs(currentTime - payload.position)
    if (diff > 2) seek(payload.position)
  } else if (payload.type === 'skip_next') {
    skipNext()
  } else if (payload.type === 'skip_prev') {
    skipPrev()
  }
}

  function broadcastUpdate(payload) {
    if (!channelRef.current) return
    channelRef.current.send({
      type: 'broadcast',
      event: 'player_update',
      payload: { ...payload, user_id: user.id }
    })
  }

  function handleHostPlay(track) {
    if (!isHost) return
    playTrack(track, tracks)
    broadcastUpdate({ type: 'play_track', track_id: track.id, position: 0 })
    supabase.from('listen_sessions').update({ track_id: track.id, is_playing: true, position: 0 }).eq('id', session?.id)
  }

  function handleHostToggle() {
  if (!isHost) return
  if (isPlaying) {
    togglePlay()
    broadcastUpdate({ type: 'pause' })
  } else {
    togglePlay()
    broadcastUpdate({ type: 'play' })
  }
}

  function handleHostSkipNext() {
    if (!isHost) return
    skipNext()
    broadcastUpdate({ type: 'skip_next' })
  }

  function handleHostSkipPrev() {
    if (!isHost) return
    skipPrev()
    broadcastUpdate({ type: 'skip_prev' })
  }

  async function leaveSession() {
    await cleanup()
    if (isHost && session) {
      await supabase.from('listen_sessions').delete().eq('id', session.id)
    }
    navigate('/')
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/listen/${session?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const genre = currentTrack ? GENRES.find(g => g.id === currentTrack.genre) : null
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  // ── LOBBY ──────────────────────────────────────────────
  if (screen === 'lobby') {
    return (
      <div className="page lobby-page">
        <div className="lobby-card">
          <h1>Session</h1>
          <p className="lobby-sub">Écoute de la musique en sync avec tes amis</p>

          <button className="btn-primary lobby-btn" onClick={createSession} disabled={loading}>
            <Plus size={18} /> {loading ? 'Création...' : 'Créer une session'}
          </button>

          <div className="lobby-divider"><span>ou</span></div>

          <form onSubmit={handleJoinByCode} className="lobby-join">
            <div className="join-input-row">
              <Hash size={18} className="join-icon" />
              <input
                value={joinCode}
                onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Code de session (ex: ABC123)"
                maxLength={8}
                autoFocus
              />
            </div>
            {joinError && <p className="join-error">{joinError}</p>}
            <button type="submit" className="btn-primary lobby-btn" disabled={loading}>
              {loading ? 'Connexion...' : 'Rejoindre'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── SESSION ─────────────────────────────────────────────
  return (
    <div className="page listen-page">
      <div className="listen-header">
        <div>
          <h1>Session</h1>
          <div className="session-id-row">
            <span className="session-code">Code : <strong>{session?.id}</strong></span>
            <button className="btn-primary small" onClick={copyLink}>
              {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
            </button>
          </div>
        </div>
        <button className="btn-ghost danger" onClick={leaveSession}>
          <LogOut size={16} /> Quitter
        </button>
      </div>

      <div className="listen-grid">
        <div className="listen-player">
          {currentTrack ? (
            <>
              <div className="listen-cover" style={{
                backgroundImage: currentTrack.cover_url ? `url(${currentTrack.cover_url})` : 'none',
                backgroundColor: genre?.color + '22' || '#FF6B3522'
              }}>
                {!currentTrack.cover_url && <span style={{ fontSize: '4rem' }}>{genre?.emoji || '🎵'}</span>}
              </div>
              <div className="listen-track-info">
                <h2>{currentTrack.title}</h2>
                <p>{currentTrack.artist}</p>
                {genre && <span className="genre-tag" style={{ background: genre.color + '22', color: genre.color }}>{genre.emoji} {genre.label}</span>}
              </div>
              <div className="listen-progress">
                <span>{fmt(currentTime)}</span>
                <div className="progress-track" onClick={isHost ? e => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  seek(((e.clientX - rect.left) / rect.width) * duration)
                } : undefined}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
                  <div className="progress-thumb" style={{ left: `${progress}%` }} />
                </div>
                <span>{fmt(duration)}</span>
              </div>
              <div className="listen-controls">
                <button className="ctrl-btn" onClick={handleHostSkipPrev} disabled={!isHost}><SkipBack size={20} /></button>
                <button className="ctrl-btn play-btn" onClick={handleHostToggle} disabled={!isHost}>
                  {isPlaying ? <Pause size={24} fill="black" /> : <Play size={24} fill="black" />}
                </button>
                <button className="ctrl-btn" onClick={handleHostSkipNext} disabled={!isHost}><SkipForward size={20} /></button>
              </div>
              {!isHost && <p className="host-only-msg">Seul l'hôte peut contrôler la musique</p>}
            </>
          ) : (
            <div className="listen-empty">
              <Music size={48} />
              <p>{isHost ? 'Choisis un son dans la liste →' : "En attente de l'hôte..."}</p>
            </div>
          )}
        </div>

        <div className="listen-right">
          <div className="listen-members">
            <h3><Users size={16} /> {members.length} connecté{members.length !== 1 ? 's' : ''}</h3>
            <div className="members-list">
              {members.map((m, i) => (
                <div key={i} className="member-row">
                  {m.avatar ? (
                    <img src={m.avatar} className="member-avatar-img" alt="" />
                  ) : (
                    <div className="member-avatar">{m.username?.[0]?.toUpperCase()}</div>
                  )}
                  <span>{m.username}</span>
                  {session?.host_id === m.user_id && <span className="host-badge">Hôte</span>}
                </div>
              ))}
            </div>
          </div>

          {isHost && (
            <div className="listen-tracklist">
              <h3>🎵 Choisir un son</h3>
              <div className="listen-tracks">
                {tracks.map(t => {
                  const g = GENRES.find(g => g.id === t.genre)
                  return (
                    <div key={t.id}
                      className={`listen-track-row ${currentTrack?.id === t.id ? 'active' : ''}`}
                      onClick={() => handleHostPlay(t)}>
                      <div className="lt-cover" style={{
                        backgroundImage: t.cover_url ? `url(${t.cover_url})` : 'none',
                        backgroundColor: g?.color + '33'
                      }}>
                        {!t.cover_url && <span>{g?.emoji || '🎵'}</span>}
                      </div>
                      <div>
                        <p className="lt-title">{t.title}</p>
                        <p className="lt-artist">{t.artist}</p>
                      </div>
                      {currentTrack?.id === t.id && isPlaying && (
                        <div className="playing-indicator small"><span/><span/><span/></div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

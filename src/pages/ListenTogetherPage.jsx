import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { Play, Pause, SkipForward, SkipBack, Users, Copy, Check, Music, LogOut } from 'lucide-react'
import { GENRES } from '../lib/supabase'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function ListenTogetherPage() {
  const { sessionId } = useParams()
  const { user, profile } = useAuth()
  const { currentTrack, isPlaying, currentTime, duration, playTrack, togglePlay, skipNext, skipPrev, seek } = usePlayer()
  const navigate = useNavigate()

  const [session, setSession] = useState(null)
  const [members, setMembers] = useState([])
  const [tracks, setTracks] = useState([])
  const [copied, setCopied] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(true)
  const channelRef = useRef(null)
  const syncInterval = useRef(null)

  useEffect(() => {
    if (sessionId) {
      joinSession()
    } else {
      createSession()
    }
    fetchTracks()
    return () => {
      leaveSession()
    }
  }, [])

  async function fetchTracks() {
    const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false })
    setTracks(data || [])
  }

  async function createSession() {
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data } = await supabase.from('listen_sessions').insert({
      id,
      host_id: user.id,
      track_id: null,
      is_playing: false,
      position: 0,
    }).select().single()
    if (data) {
      setSession(data)
      setIsHost(true)
      navigate(`/listen/${id}`, { replace: true })
      subscribeToSession(id)
    }
    setLoading(false)
  }

  async function joinSession() {
    const { data } = await supabase.from('listen_sessions').select('*').eq('id', sessionId).single()
    if (!data) { navigate('/'); return }
    setSession(data)
    setIsHost(data.host_id === user.id)
    subscribeToSession(sessionId)

    // Sync current state
    if (data.track_id) {
      const { data: track } = await supabase.from('tracks').select('*').eq('id', data.track_id).single()
      if (track) {
        playTrack(track, [track])
        setTimeout(() => seek(data.position || 0), 500)
        if (!data.is_playing) togglePlay()
      }
    }
    setLoading(false)
  }

  function subscribeToSession(id) {
    const channel = supabase.channel(`listen:${id}`)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        setMembers(Object.values(state).flat())
      })
      .on('broadcast', { event: 'player_update' }, ({ payload }) => {
        if (payload.user_id === user.id) return
        handleRemoteUpdate(payload)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: user.id,
            username: profile?.username || 'Inconnu',
            avatar: profile?.avatar_url || null,
          })
        }
      })
    channelRef.current = channel

    // Host broadcasts position every 3s
    if (isHost) {
      syncInterval.current = setInterval(() => {
        broadcastUpdate({ type: 'sync', position: currentTime })
      }, 3000)
    }
  }

  async function handleRemoteUpdate(payload) {
    if (payload.type === 'play_track') {
      const { data: track } = await supabase.from('tracks').select('*').eq('id', payload.track_id).single()
      if (track) playTrack(track, tracks)
    } else if (payload.type === 'toggle') {
      togglePlay()
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
    broadcastUpdate({ type: 'play_track', track_id: track.id })
    supabase.from('listen_sessions').update({ track_id: track.id, is_playing: true, position: 0 }).eq('id', session?.id)
  }

  function handleHostToggle() {
    if (!isHost) return
    togglePlay()
    broadcastUpdate({ type: 'toggle' })
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
    if (channelRef.current) await supabase.removeChannel(channelRef.current)
    if (syncInterval.current) clearInterval(syncInterval.current)
    if (isHost && session) {
      await supabase.from('listen_sessions').delete().eq('id', session.id)
    }
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/listen/${session?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const genre = currentTrack ? GENRES.find(g => g.id === currentTrack.genre) : null
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (loading) return <div className="page loading"><div className="spinner" /></div>

  return (
    <div className="page listen-page">
      {/* Header */}
      <div className="listen-header">
        <div>
          <h1>🎧 Écoute en groupe</h1>
          <div className="session-id-row">
            <span className="session-code">Code : <strong>{session?.id}</strong></span>
            <button className="btn-primary small" onClick={copyLink}>
              {copied ? <><Check size={14} /> Copié !</> : <><Copy size={14} /> Copier le lien</>}
            </button>
          </div>
        </div>
        <button className="btn-ghost danger" onClick={() => { leaveSession(); navigate('/') }}>
          <LogOut size={16} /> Quitter
        </button>
      </div>

      <div className="listen-grid">
        {/* Player principal */}
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
              <p>{isHost ? 'Choisis un son dans la liste →' : 'En attente de l\'hôte...'}</p>
            </div>
          )}
        </div>

        <div className="listen-right">
          {/* Membres */}
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

          {/* Liste des sons */}
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

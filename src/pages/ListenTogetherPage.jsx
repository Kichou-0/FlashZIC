import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { usePlayer } from '../contexts/PlayerContext'
import { Play, Pause, SkipForward, SkipBack, Users, Copy, Check, Music, LogOut, Plus, Hash } from 'lucide-react'
import { GENRES } from '../lib/supabase'

const SESSION_KEY = 'flashzic_session'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function ListenTogetherPage() {
  const { sessionId } = useParams()
  const { user, profile } = useAuth()
  const { currentTrack, isPlaying, currentTime, duration, playTrack, togglePlay, seek, audioRef } = usePlayer()
  const navigate = useNavigate()

  const [screen, setScreen] = useState('lobby')
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [session, setSession] = useState(null)
  const [members, setMembers] = useState([])
  const [tracks, setTracks] = useState([])
  const [copied, setCopied] = useState(false)
  const [isHost, setIsHost] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listenTab, setListenTab] = useState('all')
  const [listenSearch, setListenSearch] = useState('')
  const [playlists, setPlaylists] = useState([])
  const [activePlaylist, setActivePlaylist] = useState(null)
  const [playlistTracks, setPlaylistTracks] = useState([])
  const channelRef = useRef(null)
  const syncInterval = useRef(null)
  const isHostRef = useRef(false)
  const tracksRef = useRef([])
  const joiningRef = useRef(false)
  
 useEffect(() => {
  fetchTracks()
  fetchPlaylists()

  const saved = localStorage.getItem(SESSION_KEY)
  const idToJoin = saved ? JSON.parse(saved).sessionId : sessionId
  if (idToJoin) handleJoinById(idToJoin)
}, [])

  useEffect(() => {
    if (!isHost || !audioRef?.current) return
    const audio = audioRef.current
    function onEnded() {
      const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
      const next = tracks[(currentIndex + 1) % tracks.length]
      if (next) handleHostPlay(next)
    }
    audio.addEventListener('ended', onEnded)
    return () => audio.removeEventListener('ended', onEnded)
  }, [isHost, currentTrack, tracks])

  async function fetchTracks() {
    const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false })
    setTracks(data || [])
    tracksRef.current = data || []
  }

  async function fetchPlaylists() {
    const { data } = await supabase.from('playlists').select('*').eq('user_id', user.id)
    setPlaylists(data || [])
  }

  async function openPlaylist(pl) {
    setActivePlaylist(pl)
    const { data } = await supabase.from('playlist_tracks').select('tracks(*)').eq('playlist_id', pl.id)
    setPlaylistTracks(data?.map(r => r.tracks) || [])
  }

  async function cleanup(deleteSession = false) {
    if (syncInterval.current) { clearInterval(syncInterval.current); syncInterval.current = null }
    if (channelRef.current) { await supabase.removeChannel(channelRef.current); channelRef.current = null }
    if (deleteSession && session) {
      await supabase.from('listen_sessions').delete().eq('id', session.id)
    }
    localStorage.removeItem(SESSION_KEY)
  }

  async function createSession() {
    setLoading(true)
    const id = Math.random().toString(36).substring(2, 8).toUpperCase()
    const { data, error } = await supabase.from('listen_sessions').insert({
      id, host_id: user.id, track_id: null, is_playing: false, position: 0,
    }).select().single()
    if (error || !data) { setLoading(false); return }
    setSession(data)
    setIsHost(true)
    isHostRef.current = true
    localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: id, isHost: true }))
    navigate(`/listen/${id}`, { replace: true })
    subscribeToSession(id, true)
    setScreen('session')
    setLoading(false)
  }

  async function handleJoinById(id) {
  if (joiningRef.current) return
  joiningRef.current = true
  setLoading(true)
  setJoinError('')
  const code = id.toUpperCase().trim()
  const { data, error } = await supabase.from('listen_sessions').select('*').eq('id', code).single()
  if (error || !data) {
    setJoinError('Session introuvable')
    localStorage.removeItem(SESSION_KEY)
    joiningRef.current = false
    setLoading(false)
    return
  }
  const host = data.host_id === user.id
  setSession(data)
  setIsHost(host)
  isHostRef.current = host
  localStorage.setItem(SESSION_KEY, JSON.stringify({ sessionId: code, isHost: host }))
  subscribeToSession(code, host)
  if (data.track_id) {
    const { data: track } = await supabase.from('tracks').select('*').eq('id', data.track_id).single()
    if (track) {
      playTrack(track, tracksRef.current.length ? tracksRef.current : [track])
      setTimeout(() => {
        if (audioRef?.current) audioRef.current.currentTime = data.position || 0
      }, 800)
    }
  }
  navigate(`/listen/${code}`, { replace: true })
  setScreen('session')
  joiningRef.current = false
  setLoading(false)
}
  async function handleJoinByCode(e) {
    e.preventDefault()
    if (!joinCode.trim()) return
    await handleJoinById(joinCode)
  }

  async function subscribeToSession(id, host) {
  if (channelRef.current) {
    await supabase.removeChannel(channelRef.current)
    channelRef.current = null
  }

  // Supprime tous les channels existants avec ce nom
  const existing = supabase.getChannels().find(c => c.topic === `realtime:listen:${id}`)
  if (existing) await supabase.removeChannel(existing)

  const channel = supabase.channel(`listen:${id}`, {
    config: { presence: { key: user.id } }
  })

  channel.on('presence', { event: 'sync' }, () => {
    const state = channel.presenceState()
    setMembers(Object.values(state).flat())
  })

  channel.on('broadcast', { event: 'player_update' }, ({ payload }) => {
    if (payload.user_id === user.id) return
    if (!isHostRef.current) handleRemoteUpdate(payload)
  })

  channel.subscribe(async (status) => {
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
    if (syncInterval.current) clearInterval(syncInterval.current)
    syncInterval.current = setInterval(() => {
      if (channelRef.current && audioRef?.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'player_update',
          payload: { type: 'sync', position: audioRef.current.currentTime, user_id: user.id }
        })
      }
    }, 3000)
  }
}
  
  async function handleRemoteUpdate(payload) {
    if (payload.type === 'play_track') {
      const { data: track } = await supabase.from('tracks').select('*').eq('id', payload.track_id).single()
      if (track) {
        playTrack(track, tracksRef.current.length ? tracksRef.current : [track])
        setTimeout(() => {
          if (audioRef?.current) audioRef.current.currentTime = payload.position || 0
        }, 800)
      }
    } else if (payload.type === 'play') {
      if (audioRef?.current) audioRef.current.play().catch(() => {})
    } else if (payload.type === 'pause') {
      if (audioRef?.current) audioRef.current.pause()
    } else if (payload.type === 'sync') {
      if (audioRef?.current) {
        const diff = Math.abs(audioRef.current.currentTime - payload.position)
        if (diff > 2) audioRef.current.currentTime = payload.position
      }
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
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
    const next = tracks[(currentIndex + 1) % tracks.length]
    if (next) handleHostPlay(next)
  }

  function handleHostSkipPrev() {
    if (!isHost) return
    const currentIndex = tracks.findIndex(t => t.id === currentTrack?.id)
    const prev = tracks[(currentIndex - 1 + tracks.length) % tracks.length]
    if (prev) handleHostPlay(prev)
  }

  async function leaveSession() {
    await cleanup(isHostRef.current)
    navigate('/')
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/listen/${session?.id}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const genre = currentTrack ? GENRES.find(g => g.id === currentTrack.genre) : null
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  const filteredTracks = tracks.filter(t =>
    t.title.toLowerCase().includes(listenSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(listenSearch.toLowerCase())
  )

  const filteredPlaylistTracks = playlistTracks.filter(t =>
    t.title.toLowerCase().includes(listenSearch.toLowerCase()) ||
    t.artist.toLowerCase().includes(listenSearch.toLowerCase())
  )

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
              <Hash size={18} />
              <input value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Code de session (ex: ABC123)" maxLength={8} autoFocus />
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
              <div className="listen-tabs">
                <button className={listenTab === 'all' ? 'active' : ''} onClick={() => { setListenTab('all'); setActivePlaylist(null) }}>Tous</button>
                <button className={listenTab === 'playlist' ? 'active' : ''} onClick={() => setListenTab('playlist')}>Playlists</button>
              </div>
              <input className="listen-search" placeholder="Rechercher..." value={listenSearch} onChange={e => setListenSearch(e.target.value)} />
              <div className="listen-tracks">
                {listenTab === 'all' ? (
                  filteredTracks.map(t => {
                    const g = GENRES.find(g => g.id === t.genre)
                    return (
                      <div key={t.id} className={`listen-track-row ${currentTrack?.id === t.id ? 'active' : ''}`} onClick={() => handleHostPlay(t)}>
                        <div className="lt-cover" style={{ backgroundImage: t.cover_url ? `url(${t.cover_url})` : 'none', backgroundColor: g?.color + '33' }}>
                          {!t.cover_url && <span>{g?.emoji || '🎵'}</span>}
                        </div>
                        <div><p className="lt-title">{t.title}</p><p className="lt-artist">{t.artist}</p></div>
                        {currentTrack?.id === t.id && isPlaying && <div className="playing-indicator small"><span/><span/><span/></div>}
                      </div>
                    )
                  })
                ) : !activePlaylist ? (
                  playlists.length === 0 ? <p className="empty">Aucune playlist</p> : (
                    playlists.map(pl => (
                      <div key={pl.id} className="listen-track-row" onClick={() => openPlaylist(pl)}>
                        <div className="lt-cover" style={{ backgroundImage: pl.cover_url ? `url(${pl.cover_url})` : 'none', backgroundColor: 'var(--bg3)' }}>
                          {!pl.cover_url && <span>🎵</span>}
                        </div>
                        <div><p className="lt-title">{pl.name}</p><p className="lt-artist">Playlist</p></div>
                      </div>
                    ))
                  )
                ) : (
                  <>
                    <div className="listen-track-row" onClick={() => setActivePlaylist(null)}>
                      <span style={{ color: 'var(--muted)', fontSize: '0.85rem', padding: '4px 0' }}>← Retour</span>
                    </div>
                    {filteredPlaylistTracks.map(t => {
                      const g = GENRES.find(g => g.id === t.genre)
                      return (
                        <div key={t.id} className={`listen-track-row ${currentTrack?.id === t.id ? 'active' : ''}`} onClick={() => handleHostPlay(t)}>
                          <div className="lt-cover" style={{ backgroundImage: t.cover_url ? `url(${t.cover_url})` : 'none', backgroundColor: g?.color + '33' }}>
                            {!t.cover_url && <span>{g?.emoji || '🎵'}</span>}
                          </div>
                          <div><p className="lt-title">{t.title}</p><p className="lt-artist">{t.artist}</p></div>
                          {currentTrack?.id === t.id && isPlaying && <div className="playing-indicator small"><span/><span/><span/></div>}
                        </div>
                      )
                    })}
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

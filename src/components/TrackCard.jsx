import { useState } from 'react'
import { Play, Pause, Download, ListPlus } from 'lucide-react'
import { usePlayer } from '../contexts/PlayerContext'
import { useAuth } from '../contexts/AuthContext'
import { GENRES } from '../lib/supabase'
import AddToPlaylistModal from './AddToPlaylistModal'
import { supabase } from '../lib/supabase'

export default function TrackCard({ track, trackList = [] }) {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer()
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const isActive = currentTrack?.id === track.id
  const genre = GENRES.find(g => g.id === track.genre)

 function handlePlay() {
  if (isActive) {
    togglePlay()
  } else {
    playTrack(track, trackList)
    supabase.rpc('increment_plays', { track_id: track.id })
    track.plays = (track.plays || 0) + 1
  }
}
  return (
    <>
      <div className={`track-card ${isActive ? 'active' : ''}`}>
        <div className="track-cover" onClick={handlePlay}
          style={{ backgroundImage: track.cover_url ? `url(${track.cover_url})` : 'none', '--genre-color': genre?.color || '#6B7280' }}>
          {!track.cover_url && <div className="cover-placeholder">{genre?.emoji || '🎵'}</div>}
          <div className="play-overlay">
            {isActive && isPlaying ? <Pause size={20} fill="white" /> : <Play size={20} fill="white" />}
          </div>
          {isActive && isPlaying && <div className="playing-indicator"><span/><span/><span/></div>}
        </div>
        <div className="track-info">
          <p className="track-title">{track.title}</p>
          <p className="track-artist">{track.artist}</p>
          <div className="track-meta">
            {genre && <span className="genre-tag" style={{ background: genre.color + '22', color: genre.color }}>{genre.emoji} {genre.label}</span>}
            <span className="plays">▶ {track.plays || 0}</span>
          </div>
        </div>
        <div className="track-actions">
          <button className="icon-btn" onClick={handlePlay} title="Play/Pause">
            {isActive && isPlaying ? <Pause size={18} /> : <Play size={18} />}
          </button>
          {user && (
            <button className="icon-btn" onClick={() => setShowModal(true)} title="Ajouter à playlist">
              <ListPlus size={18} />
            </button>
          )}
          {track.audio_url && (
            <a href={track.audio_url} download className="icon-btn" title="Télécharger">
              <Download size={18} />
            </a>
          )}
        </div>
      </div>
      {showModal && <AddToPlaylistModal track={track} onClose={() => setShowModal(false)} />}
    </>
  )
}

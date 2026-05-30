import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Download } from 'lucide-react'
import { usePlayer } from '../contexts/PlayerContext'
import { GENRES } from '../lib/supabase'

function fmt(s) {
  if (!s || isNaN(s)) return '0:00'
  return `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
}

export default function PlayerBar() {
  const { currentTrack, isPlaying, currentTime, duration, volume, togglePlay, skipNext, skipPrev, seek, changeVolume } = usePlayer()

  if (!currentTrack) return null
  const genre = GENRES.find(g => g.id === currentTrack.genre)
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div className="player-bar" style={{ '--genre-color': genre?.color || '#FF6B35' }}>
      <div className="player-track">
        <div className="player-cover" style={{
          backgroundImage: currentTrack.cover_url ? `url(${currentTrack.cover_url})` : 'none',
          backgroundColor: genre?.color + '33' || '#FF6B3533'
        }}>
          {!currentTrack.cover_url && <span>{genre?.emoji || '🎵'}</span>}
        </div>
        <div>
          <p className="player-title">{currentTrack.title}</p>
          <p className="player-artist">{currentTrack.artist}</p>
        </div>
      </div>

      <div className="player-center">
        <div className="player-controls">
          <button className="ctrl-btn" onClick={skipPrev}><SkipBack size={18} /></button>
          <button className="ctrl-btn play-btn" onClick={togglePlay}>
            {isPlaying ? <Pause size={22} fill="black" /> : <Play size={22} fill="black" />}
          </button>
          <button className="ctrl-btn" onClick={skipNext}><SkipForward size={18} /></button>
        </div>
        <div className="progress-row">
          <span className="time">{fmt(currentTime)}</span>
          <div className="progress-track" onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect()
            seek(((e.clientX - rect.left) / rect.width) * duration)
          }}>
            <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            <div className="progress-thumb" style={{ left: `${progress}%` }} />
          </div>
          <span className="time">{fmt(duration)}</span>
        </div>
      </div>

      <div className="player-right">
        <button className="ctrl-btn small" onClick={() => changeVolume(volume > 0 ? 0 : 0.8)}>
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input type="range" min="0" max="1" step="0.01" value={volume}
          onChange={e => changeVolume(parseFloat(e.target.value))}
          className="volume-slider" />
        {currentTrack.audio_url && (
          <a href={currentTrack.audio_url} download className="ctrl-btn small" title="Télécharger">
            <Download size={16} />
          </a>
        )}
      </div>
    </div>
  )
}

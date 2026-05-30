import { createContext, useContext, useEffect, useRef, useState } from 'react'

const PlayerContext = createContext({})

export function PlayerProvider({ children }) {
  const audioRef = useRef(new Audio())
  const [currentTrack, setCurrentTrack] = useState(null)
  const [queue, setQueue] = useState([])
  const [queueIndex, setQueueIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(0.8)

  const audio = audioRef.current

  useEffect(() => {
    audio.volume = volume
    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onDurationChange = () => setDuration(audio.duration || 0)
    const onEnded = () => skipNext()
    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
    }
  }, [queue, queueIndex])

  function playTrack(track, trackList = []) {
    const list = trackList.length > 0 ? trackList : [track]
    const idx = list.findIndex(t => t.id === track.id)
    setQueue(list)
    setQueueIndex(idx >= 0 ? idx : 0)
    setCurrentTrack(track)
    audio.src = track.audio_url
    audio.play()
  }

  function togglePlay() {
    if (isPlaying) audio.pause()
    else audio.play()
  }

  function skipNext() {
    if (queue.length === 0) return
    const next = (queueIndex + 1) % queue.length
    setQueueIndex(next)
    const track = queue[next]
    setCurrentTrack(track)
    audio.src = track.audio_url
    audio.play()
  }

  function skipPrev() {
    if (audio.currentTime > 3) { audio.currentTime = 0; return }
    if (queue.length === 0) return
    const prev = (queueIndex - 1 + queue.length) % queue.length
    setQueueIndex(prev)
    const track = queue[prev]
    setCurrentTrack(track)
    audio.src = track.audio_url
    audio.play()
  }

  function seek(time) {
    audio.currentTime = time
    setCurrentTime(time)
  }

  function changeVolume(v) {
    setVolume(v)
    audio.volume = v
  }

  return (
    <PlayerContext.Provider value={{
      currentTrack, isPlaying, currentTime, duration, volume, queue,
      playTrack, togglePlay, skipNext, skipPrev, seek, changeVolume
    }}>
      {children}
    </PlayerContext.Provider>
  )
}

export const usePlayer = () => useContext(PlayerContext)

import { useState } from 'react'
import { supabase, GENRES } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { Upload, Music, X } from 'lucide-react'

export default function UploadPage() {
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [genre, setGenre] = useState('rap')
  const [audioFile, setAudioFile] = useState(null)
  const [coverFile, setCoverFile] = useState(null)
  const [coverPreview, setCoverPreview] = useState(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  function handleCover(e) {
    const f = e.target.files[0]
    if (!f) return
    setCoverFile(f)
    setCoverPreview(URL.createObjectURL(f))
  }

  async function handleUpload(e) {
    e.preventDefault()
    if (!audioFile) { setError('Choisis un fichier audio'); return }
    if (!title.trim()) { setError('Titre requis'); return }
    setError('')
    setUploading(true)
    setProgress(10)

    try {
      // Upload audio
      const audioExt = audioFile.name.split('.').pop()
      const audioPath = `${user.id}/${Date.now()}.${audioExt}`
      const { error: audioErr } = await supabase.storage
        .from('tracks')
        .upload(audioPath, audioFile, { contentType: audioFile.type })
      if (audioErr) throw audioErr
      setProgress(50)

      const { data: { publicUrl: audioUrl } } = supabase.storage.from('tracks').getPublicUrl(audioPath)

      // Upload cover (optional)
      let coverUrl = null
      if (coverFile) {
        const coverExt = coverFile.name.split('.').pop()
        const coverPath = `covers/${user.id}/${Date.now()}.${coverExt}`
        const { error: coverErr } = await supabase.storage
          .from('tracks')
          .upload(coverPath, coverFile, { contentType: coverFile.type })
        if (!coverErr) {
          const { data: { publicUrl } } = supabase.storage.from('tracks').getPublicUrl(coverPath)
          coverUrl = publicUrl
        }
      }
      setProgress(80)

      // Save to DB
      const { error: dbErr } = await supabase.from('tracks').insert({
        title,
        artist: artist || 'Inconnu',
        genre,
        audio_url: audioUrl,
        cover_url: coverUrl,
        uploaded_by: user.id,
        plays: 0,
      })
      if (dbErr) throw dbErr
      setProgress(100)
      setDone(true)
      setTitle(''); setArtist(''); setAudioFile(null); setCoverFile(null); setCoverPreview(null)
    } catch (err) {
      setError(err.message)
    }
    setUploading(false)
  }

  return (
    <div className="page upload-page">
      <div className="page-header">
        <h1>Upload un son</h1>
        <p>Partage ta musique avec la communauté FlashZIC</p>
      </div>

      {done && (
        <div className="success-banner">
          ✅ Son uploadé avec succès ! Il est maintenant disponible.
          <button onClick={() => setDone(false)}><X size={16} /></button>
        </div>
      )}

      <form onSubmit={handleUpload} className="upload-form">
        <div className="upload-grid">
          {/* Cover */}
          <label className="cover-upload" style={{ backgroundImage: coverPreview ? `url(${coverPreview})` : 'none' }}>
            {!coverPreview && (
              <>
                <Music size={32} />
                <span>Cover (optionnel)</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={handleCover} hidden />
          </label>

          <div className="upload-fields">
            <div className="field">
              <label>Titre *</label>
              <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Titre du son" required />
            </div>
            <div className="field">
              <label>Artiste</label>
              <input value={artist} onChange={e => setArtist(e.target.value)} placeholder="Nom de l'artiste" />
            </div>
            <div className="field">
              <label>Genre</label>
              <div className="genre-picker">
                {GENRES.map(g => (
                  <button type="button" key={g.id}
                    className={`genre-btn ${genre === g.id ? 'active' : ''}`}
                    style={{ '--genre-color': g.color }}
                    onClick={() => setGenre(g.id)}>
                    {g.emoji} {g.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Audio file */}
        <label className={`audio-drop ${audioFile ? 'has-file' : ''}`}>
          <Upload size={24} />
          {audioFile ? (
            <span>🎵 {audioFile.name}</span>
          ) : (
            <span>Clique pour choisir un fichier audio (MP3, WAV, OGG, FLAC)</span>
          )}
          <input type="file" accept="audio/*" onChange={e => setAudioFile(e.target.files[0])} hidden />
        </label>

        {error && <p className="upload-error">{error}</p>}

        {uploading && (
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
        )}

        <button type="submit" className="btn-primary upload-btn" disabled={uploading}>
          {uploading ? `Upload en cours... ${progress}%` : 'Publier le son'}
        </button>
      </form>
    </div>
  )
}

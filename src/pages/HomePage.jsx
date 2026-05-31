import { useEffect, useState } from 'react'
import { supabase, GENRES } from '../lib/supabase'
import TrackCard from '../components/TrackCard'
import { Search } from 'lucide-react'

export default function HomePage() {
  const [tracks, setTracks] = useState([])
  const [filtered, setFiltered] = useState([])
  const [activeGenre, setActiveGenre] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
  fetchTracks()
  const interval = setInterval(fetchTracks, 30000)
  return () => clearInterval(interval)
}, [])
  
  useEffect(() => {
    let res = tracks
    if (activeGenre !== 'all') res = res.filter(t => t.genre === activeGenre)
    if (search.trim()) {
      const q = search.toLowerCase()
      res = res.filter(t => t.title.toLowerCase().includes(q) || t.artist.toLowerCase().includes(q))
    }
    setFiltered(res)
  }, [tracks, activeGenre, search])

  async function fetchTracks() {
    const { data } = await supabase.from('tracks').select('*').order('created_at', { ascending: false })
    setTracks(data || [])
    setLoading(false)
  }

  const trending = [...tracks].sort((a, b) => (b.plays || 0) - (a.plays || 0)).slice(0, 5)
  const recent = tracks.slice(0, 10)

  return (
    <div className="page home-page">
      {/* Hero */}
      <div className="hero">
        <div className="hero-text">
          <h1>Flash<span>ZIC</span></h1>
          <p>Découvre, écoute, partage.</p>
        </div>
        <div className="search-bar">
          <Search size={18} />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Recherche un son, un artiste..." />
        </div>
      </div>

      {/* Genre filter */}
      <div className="genre-filter">
        <button className={`gf-btn ${activeGenre === 'all' ? 'active' : ''}`} onClick={() => setActiveGenre('all')}>
          🎶 Tout
        </button>
        {GENRES.map(g => (
          <button key={g.id}
            className={`gf-btn ${activeGenre === g.id ? 'active' : ''}`}
            style={{ '--c': g.color }}
            onClick={() => setActiveGenre(g.id)}>
            {g.emoji} {g.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading">
          <div className="spinner" />
          <p>Chargement des sons...</p>
        </div>
      ) : (
        <>
          {search || activeGenre !== 'all' ? (
            <section>
              <h2 className="section-title">Résultats ({filtered.length})</h2>
              {filtered.length === 0 ? <p className="empty">Aucun son trouvé</p> : (
                <div className="tracks-grid">
                  {filtered.map(t => <TrackCard key={t.id} track={t} trackList={filtered} />)}
                </div>
              )}
            </section>
          ) : (
            <>
              {trending.length > 0 && (
                <section>
                  <h2 className="section-title">🔥 Tendances</h2>
                  <div className="tracks-grid">
                    {trending.map(t => <TrackCard key={t.id} track={t} trackList={trending} />)}
                  </div>
                </section>
              )}
              {recent.length > 0 && (
                <section>
                  <h2 className="section-title">🆕 Derniers sons</h2>
                  <div className="tracks-grid">
                    {recent.map(t => <TrackCard key={t.id} track={t} trackList={recent} />)}
                  </div>
                </section>
              )}
              {tracks.length === 0 && (
                <div className="empty-state">
                  <p>🎵</p>
                  <p>Aucun son pour l'instant. Sois le premier à uploader !</p>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

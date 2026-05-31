import { createClient } from '@supabase/supabase-js'

// Replace these with your Supabase project credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const GENRES = [
  { id: 'rap', label: 'Rap', emoji: '🎤', color: '#FF6B35' },
  { id: 'melo', label: 'Mélo', emoji: '💜', color: '#A855F7' },
  { id: 'afro', label: 'Afro', emoji: '🕶️', color: '#C2A944' },
  { id: 'hiphop', label: 'Hip Hop', emoji: '🌍', color: '#4994CC' },
  { id: 'rock', label: 'Rock', emoji: '🤘', color: '#AB1D3C' },
  { id: 'pop', label: 'Pop', emoji: '✨', color: '#06B6D4' },
  { id: 'brazil', label: 'Brazil', emoji: '🌴', color: '#52CC84' },
  { id: 'autre', label: 'Autre', emoji: '🎵', color: '#6B7280' },
]

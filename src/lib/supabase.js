import { createClient } from '@supabase/supabase-js'

// Replace these with your Supabase project credentials
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://YOUR_PROJECT.supabase.co'
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export const GENRES = [
  { id: 'rap', label: 'Rap', emoji: '🎤', color: '#FF6B35' },
  { id: 'melo', label: 'Mélo', emoji: '💜', color: '#A855F7' },
  { id: 'rnb', label: 'R&B', emoji: '🎷', color: '#EC4899' },
  { id: 'afro', label: 'Afro', emoji: '🌍', color: '#F59E0B' },
  { id: 'drill', label: 'Drill', emoji: '🔥', color: '#EF4444' },
  { id: 'trap', label: 'Trap', emoji: '⚡', color: '#3B82F6' },
  { id: 'pop', label: 'Pop', emoji: '✨', color: '#06B6D4' },
  { id: 'autre', label: 'Autre', emoji: '🎵', color: '#6B7280' },
]

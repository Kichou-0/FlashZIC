-- ============================================
-- FlashZIC - Supabase SQL Schema
-- Run this in your Supabase SQL Editor
-- ============================================

-- 1. Profiles (linked to auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tracks
CREATE TABLE IF NOT EXISTS tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  artist TEXT DEFAULT 'Inconnu',
  genre TEXT DEFAULT 'autre',
  audio_url TEXT NOT NULL,
  cover_url TEXT,
  uploaded_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  plays INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Playlists
CREATE TABLE IF NOT EXISTS playlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  cover_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Playlist <-> Tracks (junction table)
CREATE TABLE IF NOT EXISTS playlist_tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id UUID REFERENCES playlists(id) ON DELETE CASCADE,
  track_id UUID REFERENCES tracks(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(playlist_id, track_id)
);

-- ============================================
-- Row Level Security (RLS)
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE playlist_tracks ENABLE ROW LEVEL SECURITY;

-- Profiles: everyone can read, only owner can write
CREATE POLICY "Profiles visibles par tous" ON profiles FOR SELECT USING (true);
CREATE POLICY "Profil modifiable par le propriétaire" ON profiles FOR ALL USING (auth.uid() = id);

-- Tracks: everyone can read, authenticated users can insert, only uploader can delete
CREATE POLICY "Tracks visibles par tous" ON tracks FOR SELECT USING (true);
CREATE POLICY "Tracks uploadables par utilisateurs connectés" ON tracks FOR INSERT WITH CHECK (auth.uid() = uploaded_by);
CREATE POLICY "Tracks modifiables par le propriétaire" ON tracks FOR UPDATE USING (auth.uid() = uploaded_by);
CREATE POLICY "Tracks supprimables par le propriétaire" ON tracks FOR DELETE USING (auth.uid() = uploaded_by);

-- Playlists: owner only
CREATE POLICY "Playlists visibles par le propriétaire" ON playlists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Playlists créables par utilisateurs connectés" ON playlists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Playlists supprimables par le propriétaire" ON playlists FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks: owner of playlist
CREATE POLICY "Playlist tracks visibles par le propriétaire" ON playlist_tracks FOR SELECT
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid()));
CREATE POLICY "Ajout dans playlist par le propriétaire" ON playlist_tracks FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid()));
CREATE POLICY "Suppression dans playlist par le propriétaire" ON playlist_tracks FOR DELETE
  USING (EXISTS (SELECT 1 FROM playlists WHERE playlists.id = playlist_id AND playlists.user_id = auth.uid()));

-- ============================================
-- Storage: bucket "tracks" (audio + covers)
-- ============================================
-- Run these in the Supabase Dashboard > Storage or via SQL:

INSERT INTO storage.buckets (id, name, public)
VALUES ('tracks', 'tracks', true)
ON CONFLICT DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'tracks' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Public read tracks" ON storage.objects
  FOR SELECT USING (bucket_id = 'tracks');

-- Allow owner to delete
CREATE POLICY "Owner can delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'tracks' AND auth.uid()::text = (storage.foldername(name))[1]);

-- ============================================
-- Auto-increment plays when track is fetched
-- (optional trigger)
-- ============================================
CREATE OR REPLACE FUNCTION increment_plays(track_id UUID)
RETURNS void AS $$
  UPDATE tracks SET plays = plays + 1 WHERE id = track_id;
$$ LANGUAGE SQL SECURITY DEFINER;

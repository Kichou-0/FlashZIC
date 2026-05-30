# FlashZIC 🎵

> Ton Spotify perso — 100% gratuit à héberger

## Stack (tout gratuit)

| Service | Usage | Plan gratuit |
|---------|-------|-------------|
| **Vercel** ou **Netlify** | Hébergement frontend | ✅ Illimité |
| **Supabase** | Auth + BDD + Stockage audio | ✅ 1GB stockage, 50k users |

---

## 🚀 Installation en 3 étapes

### Étape 1 — Créer le projet Supabase

1. Va sur [supabase.com](https://supabase.com) → **New Project**
2. Choisis une région proche (ex: `West EU`)
3. Dans **SQL Editor**, colle et exécute le contenu de `supabase_schema.sql`
4. Dans **Settings > API**, copie :
   - `Project URL` → ton `SUPABASE_URL`
   - `anon public` key → ton `SUPABASE_ANON_KEY`

### Étape 2 — Configurer l'app

```bash
# Clone / ouvre le dossier
cd flashzic

# Copie le fichier d'env
cp .env.example .env

# Remplis .env avec tes clés Supabase
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIU...

# Installe les dépendances
npm install

# Lance en local
npm run dev
```

### Étape 3 — Déployer sur Vercel (gratuit)

```bash
# Option A : via CLI
npm i -g vercel
vercel

# Option B : via GitHub
# 1. Push ce dossier sur GitHub
# 2. Va sur vercel.com → Import Project
# 3. Ajoute les variables d'env VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY
# 4. Deploy !
```

---

## 🎵 Fonctionnalités

- **Comptes utilisateurs** — inscription / connexion via Supabase Auth
- **Upload de sons** — MP3, WAV, OGG, FLAC avec cover optionnelle
- **Catégories / Genres** — Rap, Mélo, R&B, Afro, Drill, Trap, Pop, Autre
- **Lecteur audio global** — play/pause, skip, seekbar, volume
- **Playlists** — création, ajout/suppression de sons
- **Recherche** — par titre ou artiste
- **Téléchargement** — bouton download sur chaque son
- **Tendances** — sons classés par nombre de lectures
- **Responsive** — mobile friendly

---

## 📁 Structure

```
src/
├── components/
│   ├── Sidebar.jsx          # Navigation latérale
│   ├── PlayerBar.jsx        # Lecteur audio en bas
│   ├── TrackCard.jsx        # Carte d'un son
│   └── AddToPlaylistModal.jsx
├── contexts/
│   ├── AuthContext.jsx      # Auth Supabase
│   └── PlayerContext.jsx    # État global du lecteur
├── lib/
│   └── supabase.js          # Client Supabase + genres
├── pages/
│   ├── AuthPage.jsx         # Login / Register
│   ├── HomePage.jsx         # Accueil + recherche
│   ├── UploadPage.jsx       # Upload de sons
│   ├── PlaylistsPage.jsx    # Gestion playlists
│   └── ProfilePage.jsx      # Profil + mes sons
├── App.jsx
├── main.jsx
└── styles.css
supabase_schema.sql          # SQL à exécuter sur Supabase
```

---

## 💡 Pour aller plus loin (améliorations possibles)

- Écoute synchronisée multi-utilisateurs (via Supabase Realtime)
- Commentaires sur les sons
- Système de likes / reposts
- Profils publics d'artistes
- Mode hors-ligne (PWA)
- Waveform visualizer

---

## Limites plan gratuit Supabase

- **Stockage** : 1 GB (≈ ~200 sons MP3 de bonne qualité)
- **Bande passante** : 2 GB/mois
- **Utilisateurs** : 50 000
- **Base de données** : 500 MB

Pour plus de stockage, tu peux aussi stocker les fichiers sur **Cloudflare R2** (10 GB gratuits/mois) et juste enregistrer l'URL dans Supabase.

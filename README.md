# Landing Page Feed YouTube Otomatis

Website TypeScript (TanStack Start + React 19 + Tailwind v4) yang membaca **seluruh video**
dari channel YouTube secara otomatis (RSS + playlist uploads, hingga 999 video) lalu
menjadikannya halaman yang mudah diindeks Google.

## Fitur SEO

- Satu halaman per video: `/video/<id>` dengan title, description, canonical, Open Graph, Twitter Card
- JSON-LD `VideoObject` (halaman video) dan `ItemList` (beranda)
- `sitemap.xml` dinamis berisi semua video + `robots.txt` terbuka untuk semua crawler
- Responsif penuh (1 kolom mobile, 2 tablet, 3 desktop), gambar `lazy` + `aspect-ratio` anti layout shift

## Menjalankan lokal

```bash
bun install
bun run dev          # http://localhost:8080
```

## Deploy ke GitHub Pages (repository publik)

1. Push repo ini ke GitHub (repository **Public**).
2. Buka **Settings → Pages → Build and deployment → Source: GitHub Actions**.
3. Workflow `.github/workflows/deploy.yml` otomatis:
   - build situs statis dari feed YouTube (`bun run build:static` → folder `dist-static/`),
   - deploy ke GitHub Pages,
   - jalan ulang tiap 6 jam supaya video baru ikut terindeks.

Build statis manual:

```bash
SITE_URL=https://username.github.io BASE_PATH=/nama-repo bun run build:static
```

Hasilnya: `dist-static/index.html`, `dist-static/video/<id>/index.html`,
`sitemap.xml`, `robots.txt`, `404.html`, `.nojekyll`.

## Google Search Console

1. Verifikasi domain/URL Pages (letakkan file verifikasi di `public/`, otomatis ikut tersalin).
2. Daftarkan `https://<domain>/sitemap.xml`.
3. Gunakan URL Inspection → Request indexing untuk halaman prioritas.

## Ganti channel

Ubah `YOUTUBE_CHANNEL_ID` di `src/lib/youtube.ts`.

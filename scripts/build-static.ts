/**
 * Static site generator for GitHub Pages.
 *
 * Reads the YouTube feed (all uploads) and writes a plain, fast, fully
 * indexable static website:
 *
 *   dist-static/index.html
 *   dist-static/video/<id>/index.html
 *   dist-static/sitemap.xml
 *   dist-static/robots.txt
 *   dist-static/.nojekyll
 *
 * Run: bun run scripts/build-static.ts
 * Env: SITE_URL=https://user.github.io/repo (optional but recommended)
 */
import { mkdir, writeFile, copyFile, access } from "node:fs/promises";
import { join } from "node:path";
import { excerpt, fetchYoutubeFeed, formatDate, type YoutubeVideo } from "../src/lib/youtube";

const OUT = process.env["OUTPUT_DIR"] ?? "dist-static";
const SITE_URL = (process.env["SITE_URL"] ?? "").replace(/\/$/, "");
const BASE_PATH = (process.env["BASE_PATH"] ?? "").replace(/\/$/, "");

const esc = (v: string) =>
  v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const abs = (path: string) => `${SITE_URL}${BASE_PATH}${path}`;
const href = (path: string) => `${BASE_PATH}${path}`;

const STYLES = `
:root{color-scheme:dark;--bg:#0b0c0e;--fg:#f4f4f5;--muted:#a1a1aa;--line:#26272b;--accent:#f2b544}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.55 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
a{color:inherit;text-decoration:none}
.wrap{max-width:1120px;margin:0 auto;padding:0 20px}
header,footer{border-bottom:1px solid var(--line)}
footer{border:0;border-top:1px solid var(--line);color:var(--muted);font-size:13px}
.bar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:16px 0}
.btn{background:var(--accent);color:#111;border-radius:999px;padding:8px 16px;font-size:14px;font-weight:600}
.grid{display:grid;gap:22px;grid-template-columns:1fr;padding:28px 0}
@media(min-width:640px){.grid{grid-template-columns:repeat(2,1fr)}}
@media(min-width:1024px){.grid{grid-template-columns:repeat(3,1fr)}}
img{width:100%;height:auto;aspect-ratio:16/9;object-fit:cover;border-radius:12px;display:block;background:#18191c}
h1{font-size:clamp(22px,4vw,34px);line-height:1.2;margin:18px 0 6px}
h2{font-size:16px;line-height:1.35;margin:10px 0 2px;font-weight:600}
time{color:var(--muted);font-size:12px}
.player{position:relative;aspect-ratio:16/9;border-radius:14px;overflow:hidden;border:1px solid var(--line);margin-top:18px}
.player iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.desc{color:var(--muted);white-space:pre-line;margin-top:18px}
`.trim();

function page(opts: {
  title: string;
  description: string;
  canonical: string;
  image?: string;
  ogType: string;
  jsonLd: unknown;
  body: string;
}) {
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(opts.title)}</title>
<meta name="description" content="${esc(opts.description)}">
<link rel="canonical" href="${esc(opts.canonical)}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
<meta property="og:title" content="${esc(opts.title)}">
<meta property="og:description" content="${esc(opts.description)}">
<meta property="og:type" content="${opts.ogType}">
<meta property="og:url" content="${esc(opts.canonical)}">
${opts.image ? `<meta property="og:image" content="${esc(opts.image)}">\n<meta name="twitter:image" content="${esc(opts.image)}">` : ""}
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://i.ytimg.com" crossorigin>
<style>${STYLES}</style>
<script type="application/ld+json">${JSON.stringify(opts.jsonLd)}</script>
</head>
<body>${opts.body}</body>
</html>`;
}

function indexPage(channelTitle: string, channelUrl: string, videos: YoutubeVideo[]) {
  const title = `${channelTitle} — Semua Video`;
  const description = `Kumpulan ${videos.length} video dari channel ${channelTitle}, diperbarui otomatis dari feed YouTube.`;
  const cards = videos
    .map(
      (v, i) => `<article>
<a href="${href(`/video/${v.id}/`)}">
<img src="${esc(v.thumbnail)}" alt="${esc(v.title)}" width="640" height="360" loading="${i < 3 ? "eager" : "lazy"}" decoding="async">
<h2>${esc(v.title)}</h2>
</a>${v.published ? `<time datetime="${esc(v.published)}">${esc(formatDate(v.published))}</time>` : ""}
</article>`,
    )
    .join("\n");

  return page({
    title,
    description,
    canonical: abs("/"),
    image: videos[0]?.thumbnail,
    ogType: "website",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: title,
      numberOfItems: videos.length,
      itemListElement: videos.map((v, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: abs(`/video/${v.id}/`),
        name: v.title,
      })),
    },
    body: `<header><div class="wrap bar"><h1 style="font-size:18px;margin:0">${esc(channelTitle)}</h1><a class="btn" href="${esc(channelUrl)}" rel="noopener" target="_blank">Subscribe</a></div></header>
<main class="wrap"><div class="grid">${cards}</div></main>
<footer><div class="wrap" style="padding:18px 0"><a href="${href("/sitemap.xml")}">sitemap.xml</a></div></footer>`,
  });
}

function videoPage(video: YoutubeVideo, channelTitle: string) {
  const description = excerpt(video.description) || `Tonton video ${video.title} dari ${channelTitle}.`;
  return page({
    title: `${video.title} — ${channelTitle}`,
    description,
    canonical: abs(`/video/${video.id}/`),
    image: video.thumbnail,
    ogType: "video.other",
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      name: video.title,
      description,
      thumbnailUrl: [video.thumbnail],
      ...(video.published ? { uploadDate: video.published } : {}),
      embedUrl: `https://www.youtube.com/embed/${video.id}`,
      contentUrl: video.url,
      publisher: { "@type": "Organization", name: channelTitle },
    },
    body: `<header><div class="wrap bar"><a href="${href("/")}">${esc(channelTitle)}</a><a class="btn" href="${esc(video.url)}" rel="noopener" target="_blank">Tonton di YouTube</a></div></header>
<main class="wrap"><h1>${esc(video.title)}</h1>${video.published ? `<time datetime="${esc(video.published)}">${esc(formatDate(video.published))}</time>` : ""}
<div class="player"><iframe src="https://www.youtube.com/embed/${video.id}" title="${esc(video.title)}" loading="lazy" allowfullscreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"></iframe></div>
${video.description ? `<p class="desc">${esc(video.description)}</p>` : ""}
<p style="margin:28px 0"><a href="${href("/")}">← Kembali ke daftar video</a></p></main>
<footer><div class="wrap" style="padding:18px 0"><a href="${href("/sitemap.xml")}">sitemap.xml</a></div></footer>`,
  });
}

function sitemap(videos: YoutubeVideo[]) {
  const urls = [
    `  <url><loc>${abs("/")}</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
    ...videos.map((v) => {
      const lastmod = v.updated || v.published;
      return `  <url><loc>${abs(`/video/${v.id}/`)}</loc>${lastmod ? `<lastmod>${lastmod}</lastmod>` : ""}<changefreq>monthly</changefreq><priority>0.8</priority></url>`;
    }),
  ];
  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join("\n")}
</urlset>`;
}

async function main() {
  const feed = await fetchYoutubeFeed();
  if (!feed.videos.length) throw new Error("Feed kosong — build dibatalkan.");

  await mkdir(OUT, { recursive: true });
  await writeFile(join(OUT, "index.html"), indexPage(feed.channelTitle, feed.channelUrl, feed.videos));
  // GitHub Pages 404 fallback keeps deep links working.
  await writeFile(join(OUT, "404.html"), indexPage(feed.channelTitle, feed.channelUrl, feed.videos));
  await writeFile(join(OUT, ".nojekyll"), "");
  await writeFile(join(OUT, "sitemap.xml"), sitemap(feed.videos));

  const robots = `User-agent: *\nAllow: /\n${SITE_URL ? `\nSitemap: ${abs("/sitemap.xml")}\n` : ""}`;
  await writeFile(join(OUT, "robots.txt"), robots);

  for (const video of feed.videos) {
    const dir = join(OUT, "video", video.id);
    await mkdir(dir, { recursive: true });
    await writeFile(join(dir, "index.html"), videoPage(video, feed.channelTitle));
  }

  // Carry over any verification files (Google Search Console HTML file, etc).
  for (const file of ["google-site-verification.html", "favicon.ico"]) {
    try {
      await access(join("public", file));
      await copyFile(join("public", file), join(OUT, file));
    } catch {
      /* optional */
    }
  }

  console.log(`Static site siap di ./${OUT} — ${feed.videos.length} halaman video.`);
}

await main();

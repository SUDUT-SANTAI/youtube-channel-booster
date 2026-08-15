import { createFileRoute, Link } from "@tanstack/react-router";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import { YOUTUBE_CHANNEL_ID, excerpt, formatDate } from "@/lib/youtube";

const SITE_TITLE = "Feed Video YouTube Otomatis — Arsip & Indeks Video";
const SITE_DESC =
  "Semua video terbaru dari channel YouTube ini dikumpulkan otomatis dari feed resmi, lengkap dengan halaman detail agar mudah ditemukan di Google.";

export const Route = createFileRoute("/")({
  loader: async () => getYoutubeFeed(),
  head: () => ({
    meta: [
      { title: SITE_TITLE },
      { name: "description", content: SITE_DESC },
      { property: "og:title", content: SITE_TITLE },
      { property: "og:description", content: SITE_DESC },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_TITLE,
          description: SITE_DESC,
        }),
      },
    ],
  }),
  component: Index,
});

function Index() {
  const feed = Route.useLoaderData();
  const [featured, ...rest] = feed.videos;

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-5">
          <span className="font-display text-lg tracking-tight">{feed.channelTitle}</span>
          <a
            href={feed.channelUrl}
            target="_blank"
            rel="noopener"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Subscribe di YouTube
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 pt-14 pb-10">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">
          Auto feed · diperbarui otomatis
        </p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-5xl">
          Setiap video baru langsung punya halaman sendiri yang siap diindeks Google
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground">
          Halaman ini membaca feed resmi channel{" "}
          <code className="rounded bg-surface px-1.5 py-0.5 text-sm">{YOUTUBE_CHANNEL_ID}</code>{" "}
          setiap kali dibuka. Video terbaru muncul otomatis, lengkap dengan judul, deskripsi,
          thumbnail, dan data terstruktur VideoObject.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <a
            href="/sitemap.xml"
            className="rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-surface"
          >
            Lihat sitemap.xml
          </a>
          <a
            href={`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`}
            target="_blank"
            rel="noopener"
            className="rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-surface"
          >
            Sumber feed RSS
          </a>
        </div>
      </section>

      {feed.videos.length === 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <div className="rounded-xl border border-border bg-surface p-8 text-muted-foreground">
            Feed belum bisa dibaca saat ini. Muat ulang halaman beberapa saat lagi.
          </div>
        </section>
      )}

      {featured && (
        <section className="mx-auto max-w-6xl px-5 pb-12">
          <article className="grid gap-6 overflow-hidden rounded-2xl border border-border bg-surface md:grid-cols-2">
            <Link to="/video/$id" params={{ id: featured.id }} className="block">
              <img
                src={featured.thumbnail}
                alt={`Thumbnail video ${featured.title}`}
                width={1280}
                height={720}
                className="h-full w-full object-cover"
              />
            </Link>
            <div className="flex flex-col justify-center p-7">
              <span className="text-xs uppercase tracking-[0.18em] text-accent">Video terbaru</span>
              <h2 className="mt-3 font-display text-2xl leading-snug">
                <Link to="/video/$id" params={{ id: featured.id }} className="hover:text-accent">
                  {featured.title}
                </Link>
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">{excerpt(featured.description, 220)}</p>
              <time className="mt-4 text-xs text-muted-foreground" dateTime={featured.published}>
                {formatDate(featured.published)}
              </time>
            </div>
          </article>
        </section>
      )}

      {rest.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 pb-24">
          <h2 className="mb-6 font-display text-xl tracking-tight">Semua video</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((video) => (
              <article
                key={video.id}
                className="group overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent/60"
              >
                <Link to="/video/$id" params={{ id: video.id }}>
                  <img
                    src={video.thumbnail}
                    alt={`Thumbnail video ${video.title}`}
                    loading="lazy"
                    width={640}
                    height={360}
                    className="aspect-video w-full object-cover"
                  />
                </Link>
                <div className="p-5">
                  <h3 className="font-display text-base leading-snug">
                    <Link
                      to="/video/$id"
                      params={{ id: video.id }}
                      className="group-hover:text-accent"
                    >
                      {video.title}
                    </Link>
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{excerpt(video.description, 110)}</p>
                  <time className="mt-3 block text-xs text-muted-foreground" dateTime={video.published}>
                    {formatDate(video.published)}
                  </time>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-border/60 bg-surface">
        <div className="mx-auto max-w-6xl px-5 py-8 text-sm text-muted-foreground">
          Konten bersumber dari feed resmi YouTube. Daftarkan alamat sitemap ke Google Search
          Console untuk mempercepat indexing.
        </div>
      </footer>
    </main>
  );
}

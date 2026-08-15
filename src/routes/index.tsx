import { createFileRoute, Link } from "@tanstack/react-router";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import { formatDate } from "@/lib/youtube";

export const Route = createFileRoute("/")({
  loader: async () => getYoutubeFeed(),
  head: ({ loaderData }) => {
    const title = loaderData?.channelTitle
      ? `${loaderData.channelTitle} — Video Terbaru`
      : "Video Terbaru";
    const desc = loaderData?.channelTitle
      ? `Daftar video terbaru dari channel ${loaderData.channelTitle}, diperbarui otomatis.`
      : "Daftar video terbaru, diperbarui otomatis.";
    const image = loaderData?.videos?.[0]?.thumbnail;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "website" },
        { property: "og:url", content: "/" },
        { name: "twitter:card", content: "summary_large_image" },
        ...(image
          ? [
              { property: "og:image", content: image },
              { name: "twitter:image", content: image },
            ]
          : []),
      ],
      links: [{ rel: "canonical", href: "/" }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "ItemList",
            name: title,
            itemListElement: (loaderData?.videos ?? []).map((v, i) => ({
              "@type": "ListItem",
              position: i + 1,
              url: `/video/${v.id}`,
              name: v.title,
            })),
          }),
        },
      ],
    };
  },
  component: Index,
});

function Index() {
  const feed = Route.useLoaderData();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5">
          <h1 className="font-display text-lg tracking-tight">{feed.channelTitle}</h1>
          <a
            href={feed.channelUrl}
            target="_blank"
            rel="noopener"
            className="rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Subscribe
          </a>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-5 py-10">
        {feed.videos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Belum ada video.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {feed.videos.map((video, i) => (
              <article key={video.id} className="group">
                <Link to="/video/$id" params={{ id: video.id }} className="block">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    loading={i < 3 ? "eager" : "lazy"}
                    width={640}
                    height={360}
                    className="aspect-video w-full rounded-xl object-cover"
                  />
                  <h2 className="mt-3 font-display text-base leading-snug group-hover:text-accent">
                    {video.title}
                  </h2>
                </Link>
                {video.published && (
                  <time className="mt-1 block text-xs text-muted-foreground" dateTime={video.published}>
                    {formatDate(video.published)}
                  </time>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-5 py-6 text-xs text-muted-foreground">
          <a href="/sitemap.xml" className="hover:text-accent">
            sitemap.xml
          </a>
        </div>
      </footer>
    </main>
  );
}

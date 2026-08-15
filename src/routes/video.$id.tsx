import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { getYoutubeFeed } from "@/lib/youtube.functions";
import { excerpt, formatDate } from "@/lib/youtube";

export const Route = createFileRoute("/video/$id")({
  loader: async ({ params }) => {
    const feed = await getYoutubeFeed();
    const video = feed.videos.find((v) => v.id === params.id);
    if (!video) throw notFound();
    return { video, channelTitle: feed.channelTitle, channelUrl: feed.channelUrl };
  },
  head: ({ params, loaderData }) => {
    if (!loaderData) {
      return { meta: [{ title: "Video tidak tersedia" }, { name: "robots", content: "noindex" }] };
    }
    const { video } = loaderData;
    const desc = excerpt(video.description) || `Tonton video ${video.title}.`;
    return {
      meta: [
        { title: `${video.title} — Video` },
        { name: "description", content: desc },
        { property: "og:title", content: video.title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "video.other" },
        { property: "og:url", content: `/video/${params.id}` },
        { property: "og:image", content: video.thumbnail },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: video.thumbnail },
      ],
      links: [{ rel: "canonical", href: `/video/${params.id}` }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: video.title,
            description: desc,
            thumbnailUrl: [video.thumbnail],
            ...(video.published ? { uploadDate: video.published } : {}),
            embedUrl: `https://www.youtube.com/embed/${video.id}`,
            contentUrl: video.url,
            publisher: { "@type": "Organization", name: loaderData.channelTitle },
          }),
        },
      ],
    };
  },
  component: VideoPage,
});

function VideoPage() {
  const { video, channelTitle, channelUrl } = Route.useLoaderData();

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/60 bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-5">
          <Link to="/" className="font-display text-lg tracking-tight hover:text-accent">
            {channelTitle}
          </Link>
          <a
            href={channelUrl}
            target="_blank"
            rel="noopener"
            className="text-sm text-muted-foreground hover:text-accent"
          >
            Channel YouTube
          </a>
        </div>
      </header>

      <article className="mx-auto max-w-4xl px-5 py-10">
        <nav className="text-sm text-muted-foreground">
          <Link to="/" className="hover:text-accent">
            Beranda
          </Link>
          <span className="px-2">/</span>
          <span>Video</span>
        </nav>

        <h1 className="mt-4 font-display text-3xl leading-tight tracking-tight sm:text-4xl">
          {video.title}
        </h1>
        {video.published && (
          <time className="mt-3 block text-sm text-muted-foreground" dateTime={video.published}>
            Dipublikasikan {formatDate(video.published)}
          </time>
        )}

        <div className="mt-7 overflow-hidden rounded-2xl border border-border bg-surface">
          <div className="aspect-video">
            <iframe
              src={`https://www.youtube.com/embed/${video.id}`}
              title={video.title}
              loading="lazy"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="h-full w-full"
            />
          </div>
        </div>

        {video.description && (
          <div className="mt-8 whitespace-pre-line text-base leading-relaxed text-muted-foreground">
            {video.description}
          </div>
        )}

        <div className="mt-10 flex flex-wrap gap-3">
          <a
            href={video.url}
            target="_blank"
            rel="noopener"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Tonton di YouTube
          </a>
          <Link
            to="/"
            className="rounded-full border border-border px-5 py-2.5 text-sm transition-colors hover:bg-surface"
          >
            Kembali ke daftar video
          </Link>
        </div>
      </article>
    </main>
  );
}

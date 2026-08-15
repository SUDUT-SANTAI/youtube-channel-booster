export const YOUTUBE_CHANNEL_ID = "UCX3eUzYV2LN5JmZPXULQM5Q";

export interface YoutubeVideo {
  id: string;
  title: string;
  description: string;
  published: string;
  updated: string;
  author: string;
  thumbnail: string;
  url: string;
}

export interface YoutubeFeed {
  channelTitle: string;
  channelUrl: string;
  videos: YoutubeVideo[];
}

function pick(block: string, tag: string): string {
  const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
  return m ? decodeXml(m[1]) : "";
}

function decodeXml(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .trim();
}

export function parseYoutubeFeed(xml: string): YoutubeFeed {
  const channelTitle = pick(xml.split("<entry>")[0], "title") || "YouTube Channel";
  const entries = xml.split("<entry>").slice(1);

  const videos: YoutubeVideo[] = entries.map((entry) => {
    const id = pick(entry, "yt:videoId");
    const thumbMatch = entry.match(/<media:thumbnail[^>]*url="([^"]+)"/);
    return {
      id,
      title: pick(entry, "title"),
      description: pick(entry, "media:description"),
      published: pick(entry, "published"),
      updated: pick(entry, "updated"),
      author: pick(entry, "name"),
      thumbnail: thumbMatch?.[1] ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
      url: `https://www.youtube.com/watch?v=${id}`,
    };
  });

  return {
    channelTitle,
    channelUrl: `https://www.youtube.com/channel/${YOUTUBE_CHANNEL_ID}`,
    videos: videos.filter((v) => v.id),
  };
}

export async function fetchYoutubeFeed(channelId = YOUTUBE_CHANNEL_ID): Promise<YoutubeFeed> {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`,
      { headers: { "User-Agent": "Mozilla/5.0 (compatible; LandingBot/1.0)" } },
    );
    if (!res.ok) throw new Error(`Feed request failed: ${res.status}`);
    return parseYoutubeFeed(await res.text());
  } catch {
    return {
      channelTitle: "YouTube Channel",
      channelUrl: `https://www.youtube.com/channel/${channelId}`,
      videos: [],
    };
  }
}

export function excerpt(text: string, max = 155): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "";
  return clean.length > max ? `${clean.slice(0, max - 1)}…` : clean;
}

export function formatDate(iso: string, locale = "id-ID"): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(locale, { day: "numeric", month: "long", year: "numeric" });
}

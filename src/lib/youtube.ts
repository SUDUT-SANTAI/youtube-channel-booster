export const YOUTUBE_CHANNEL_ID = "UCkehoNWXGlKbW4byOy63ylA";

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
  return m?.[1] ? decodeXml(m[1]) : "";
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
  const channelTitle = pick(xml.split("<entry>")[0] ?? "", "title") || "YouTube Channel";
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

async function fetchRssFeed(channelId: string): Promise<YoutubeFeed> {
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

/** RSS (rich metadata, newest 15) merged with the full uploads playlist (all videos). */
export async function fetchYoutubeFeed(channelId = YOUTUBE_CHANNEL_ID): Promise<YoutubeFeed> {
  const rss = await fetchRssFeed(channelId);
  let uploads: YoutubeVideo[] = [];
  try {
    uploads = await fetchAllUploads(channelId);
  } catch {
    uploads = [];
  }

  const byId = new Map<string, YoutubeVideo>();
  for (const v of uploads) byId.set(v.id, v);
  for (const v of rss.videos) byId.set(v.id, { ...byId.get(v.id), ...v });

  const ordered: YoutubeVideo[] = [];
  const pushed = new Set<string>();
  for (const v of [...rss.videos, ...uploads]) {
    const merged = byId.get(v.id);
    if (merged && !pushed.has(v.id)) {
      pushed.add(v.id);
      ordered.push(merged);
    }
  }

  return {
    channelTitle: rss.channelTitle,
    channelUrl: `https://www.youtube.com/channel/${channelId}`,
    videos: ordered.slice(0, MAX_VIDEOS),
  };
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
  return d.toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export const MAX_VIDEOS = 999;

function extractJson(html: string, marker: string): any | null {
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const open = html.indexOf("{", start);
  if (open === -1) return null;
  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = open; i < html.length; i++) {
    const c = html[i];
    if (inStr) {
      if (esc) esc = false;
      else if (c === "\\") esc = true;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) {
        try {
          return JSON.parse(html.slice(open, i + 1));
        } catch {
          return null;
        }
      }
    }
  }
  return null;
}

function collect(node: any, key: string, out: any[]): any[] {
  if (!node || typeof node !== "object") return out;
  if (Array.isArray(node)) {
    for (const item of node) collect(item, key, out);
    return out;
  }
  for (const [k, v] of Object.entries(node)) {
    if (k === key) out.push(v);
    else collect(v, key, out);
  }
  return out;
}

function runsText(value: any): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value.simpleText === "string") return value.simpleText;
  if (Array.isArray(value.runs)) return value.runs.map((r: any) => r.text ?? "").join("");
  return "";
}

function toVideo(renderer: any): YoutubeVideo | null {
  const id = renderer?.videoId;
  if (typeof id !== "string" || !id) return null;
  const title = runsText(renderer.title);
  const thumbs = renderer?.thumbnail?.thumbnails;
  const thumbnail =
    (Array.isArray(thumbs) && thumbs.length ? thumbs[thumbs.length - 1].url : null) ??
    `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  return {
    id,
    title: title || "Video",
    description: "",
    published: "",
    updated: "",
    author: "",
    thumbnail,
    url: `https://www.youtube.com/watch?v=${id}`,
  };
}

function uploadsPlaylistId(channelId: string): string {
  return `UU${channelId.slice(2)}`;
}

/** Reads the full uploads playlist (paginated) so all videos are indexable. */
export async function fetchAllUploads(
  channelId = YOUTUBE_CHANNEL_ID,
  max = MAX_VIDEOS,
): Promise<YoutubeVideo[]> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };
  const res = await fetch(
    `https://www.youtube.com/playlist?list=${uploadsPlaylistId(channelId)}&hl=en`,
    { headers },
  );
  if (!res.ok) throw new Error(`Playlist request failed: ${res.status}`);
  const html = await res.text();

  const apiKey = html.match(/"INNERTUBE_API_KEY":"([^"]+)"/)?.[1];
  const clientVersion = html.match(/"INNERTUBE_CLIENT_VERSION":"([^"]+)"/)?.[1] ?? "2.20240101.00.00";
  const data = extractJson(html, "ytInitialData");
  if (!data) throw new Error("ytInitialData not found");

  const videos: YoutubeVideo[] = [];
  const seen = new Set<string>();
  let continuation: string | null = null;

  const ingest = (payload: any) => {
    for (const r of collect(payload, "playlistVideoRenderer", [])) {
      const v = toVideo(r);
      if (v && !seen.has(v.id)) {
        seen.add(v.id);
        videos.push(v);
      }
    }
    const cont = collect(payload, "continuationItemRenderer", [])
      .map((c: any) => c?.continuationEndpoint?.continuationCommand?.token)
      .filter((t: any) => typeof t === "string" && t);
    continuation = cont.length ? cont[cont.length - 1] : null;
  };

  ingest(data);

  let guard = 0;
  while (continuation && videos.length < max && apiKey && guard < 50) {
    guard++;
    const next: Response = await fetch(
      `https://www.youtube.com/youtubei/v1/browse?key=${apiKey}&prettyPrint=false`,
      {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          context: { client: { clientName: "WEB", clientVersion, hl: "en", gl: "US" } },
          continuation,
        }),
      },
    );
    if (!next.ok) break;
    const before = videos.length;
    ingest(await next.json());
    if (videos.length === before) break;
  }

  return videos.slice(0, max);
}

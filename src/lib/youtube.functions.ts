import { createServerFn } from "@tanstack/react-start";
import { fetchYoutubeFeed } from "./youtube";

export const getYoutubeFeed = createServerFn({ method: "GET" }).handler(async () => {
  return fetchYoutubeFeed();
});

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route to fetch TikTok video data
  app.post("/api/fetch", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      // 1. Handle short URLs (vm.tiktok.com, vt.tiktok.com)
      let targetUrl = url;
      if (url.includes("tiktok.com") && !url.includes("/video/")) {
        const response = await axios.get(url, {
          maxRedirects: 10,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "Accept-Language": "en-US,en;q=0.9",
          },
        });
        targetUrl = response.request.res.responseUrl;
      }

      // 2. Extract Video ID
      const videoIdMatch = targetUrl.match(/\/video\/(\d+)/);
      if (!videoIdMatch) {
        return res.status(400).json({ error: "Could not find video ID in URL. Please use a direct video link." });
      }
      const videoId = videoIdMatch[1];

      // 3. Try multiple methods to get video data
      
      // Method A: TikWM API (Publicly available, very reliable for no-watermark)
      try {
        const tikwmResponse = await axios.post("https://www.tikwm.com/api/", 
          new URLSearchParams({ url: targetUrl }).toString(),
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        );

        if (tikwmResponse.data?.data) {
          const d = tikwmResponse.data.data;
          return res.json({
            id: d.id,
            title: d.title,
            thumbnail: d.cover,
            author: d.author.nickname,
            authorAvatar: d.author.avatar,
            videoUrl: d.wmplay, // Watermarked
            noWatermarkUrl: d.play, // No-watermark
            music: {
              title: d.music_info.title,
              author: d.music_info.author,
              cover: d.music_info.cover
            }
          });
        }
      } catch (e) {
        console.log("TikWM method failed, trying fallback...");
      }

      // Method B: Fallback to direct TikTok API (Mobile headers)
      const apiUrl = `https://api16-normal-c-useast1a.tiktokv.com/media/api/item/detail/?item_id=${videoId}`;
      const apiResponse = await axios.get(apiUrl, {
        headers: {
          "User-Agent": "com.ss.android.ugc.trill/2613 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)",
        },
      });

      const item = apiResponse.data?.item_list?.[0];
      if (item) {
        return res.json({
          id: item.aweme_id,
          title: item.desc,
          thumbnail: item.video.cover.url_list[0],
          author: item.author.nickname,
          authorAvatar: item.author.avatar_thumb.url_list[0],
          videoUrl: item.video.download_addr.url_list[0],
          noWatermarkUrl: item.video.play_addr.url_list[0],
          music: {
            title: item.music.title,
            author: item.music.author,
            cover: item.music.cover_thumb.url_list[0]
          }
        });
      }

      res.status(404).json({ error: "Video data could not be retrieved. The video might be private or deleted." });

    } catch (error: any) {
      console.error("Fetch error:", error.message);
      res.status(500).json({ error: "Failed to fetch video data" });
    }
  });

  // Proxy to download video (to avoid CORS on client)
  app.get("/api/download", async (req, res) => {
    const { url, filename } = req.query;
    if (!url) return res.status(400).send("URL required");

    try {
      const videoUrl = url as string;
      
      // Some TikTok CDN links are sensitive to headers
      const response = await axios({
        url: videoUrl,
        method: "GET",
        responseType: "stream",
        timeout: 30000,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
          "Accept": "*/*",
          "Accept-Encoding": "identity",
          "Connection": "keep-alive",
          "Referer": "https://www.tiktok.com/",
        },
      });

      // Forward headers from TikTok if possible, or set our own
      const contentType = response.headers["content-type"] || "video/mp4";
      const contentLength = response.headers["content-length"];

      res.setHeader("Content-Disposition", `attachment; filename="${filename || "video.mp4"}"`);
      res.setHeader("Content-Type", contentType);
      if (contentLength) {
        res.setHeader("Content-Length", contentLength);
      }
      
      // Pipe the stream directly to the client
      response.data.pipe(res);

      // Handle stream errors
      response.data.on("error", (err: any) => {
        console.error("Stream error during pipe:", err.message);
        if (!res.headersSent) {
          res.status(500).send("Download stream interrupted");
        }
      });

    } catch (error: any) {
      console.error("Download proxy error:", error.message);
      if (error.response) {
        console.error("TikTok responded with:", error.response.status);
      }
      if (!res.headersSent) {
        res.status(500).send("Failed to connect to TikTok servers for download");
      }
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

import { Handler } from "@netlify/functions";
import axios from "axios";
import * as cheerio from "cheerio";

const handler: Handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { url } = JSON.parse(event.body || "{}");

    if (!url) {
      return { statusCode: 400, body: JSON.stringify({ error: "URL is required" }) };
    }

    // 1. Handle short URLs
    let targetUrl = url;
    if (url.includes("tiktok.com") && !url.includes("/video/")) {
      const response = await axios.get(url, {
        maxRedirects: 10,
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        },
      });
      targetUrl = response.request.res.responseUrl;
    }

    // 2. Extract Video ID
    const videoIdMatch = targetUrl.match(/\/video\/(\d+)/);
    if (!videoIdMatch) {
      return { statusCode: 400, body: JSON.stringify({ error: "Invalid TikTok URL" }) };
    }
    const videoId = videoIdMatch[1];

    // 3. Try TikWM API
    try {
      const tikwmResponse = await axios.post("https://www.tikwm.com/api/", 
        new URLSearchParams({ url: targetUrl }).toString(),
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      if (tikwmResponse.data?.data) {
        const d = tikwmResponse.data.data;
        return {
          statusCode: 200,
          body: JSON.stringify({
            id: d.id,
            title: d.title,
            thumbnail: d.cover,
            author: d.author.nickname,
            authorAvatar: d.author.avatar,
            videoUrl: d.wmplay,
            noWatermarkUrl: d.play,
            music: {
              title: d.music_info.title,
              author: d.music_info.author,
              cover: d.music_info.cover
            }
          })
        };
      }
    } catch (e) {
      console.log("TikWM failed in function");
    }

    // Fallback to TikTok API
    const apiUrl = `https://api16-normal-c-useast1a.tiktokv.com/media/api/item/detail/?item_id=${videoId}`;
    const apiResponse = await axios.get(apiUrl, {
      headers: {
        "User-Agent": "com.ss.android.ugc.trill/2613 (Linux; U; Android 10; en_US; Pixel 4; Build/QQ3A.200805.001; Cronet/58.0.2991.0)",
      },
    });

    const item = apiResponse.data?.item_list?.[0];
    if (item) {
      return {
        statusCode: 200,
        body: JSON.stringify({
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
        })
      };
    }

    return { statusCode: 404, body: JSON.stringify({ error: "Video not found" }) };

  } catch (error: any) {
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};

export { handler };

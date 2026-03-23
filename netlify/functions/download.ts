import { Handler } from "@netlify/functions";
import axios from "axios";

const handler: Handler = async (event, context) => {
  const { url, filename } = event.queryStringParameters || {};

  if (!url) {
    return { statusCode: 400, body: "URL required" };
  }

  try {
    // Note: Netlify Functions have a 10MB response limit and 10s execution limit (default)
    // For large videos, this might fail on the free tier.
    // However, for most TikToks (<10MB), it should work.
    
    const response = await axios({
      url: url as string,
      method: "GET",
      responseType: "arraybuffer",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
        "Referer": "https://www.tiktok.com/",
      },
    });

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": `attachment; filename="${filename || "video.mp4"}"`,
      },
      body: Buffer.from(response.data).toString("base64"),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    return { statusCode: 500, body: "Download failed: " + error.message };
  }
};

export { handler };

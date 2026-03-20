export default async function handler(req, res) {
  const { prompt, seed } = req.query;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });

  // Use 'turbo' model — much faster than flux, fits within Vercel's 10s free tier limit
  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed || 0}&model=turbo`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000); // 9s to stay under Vercel 10s limit

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) return res.status(502).json({ error: 'Pollinations failed', status: response.status });

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(504).json({ error: 'Timeout' });
    }
    res.status(500).json({ error: 'Proxy error', detail: e.message });
  }
}

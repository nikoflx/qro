export default async function handler(req, res) {
  const { prompt, seed } = req.query;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed || 0}&model=flux`;

  try {
    const response = await fetch(url);
    if (!response.ok) return res.status(502).json({ error: 'Pollinations failed' });

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (e) {
    res.status(500).json({ error: 'Proxy error', detail: e.message });
  }
}

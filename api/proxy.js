export default async function handler(req, res) {
  const { prompt, seed } = req.query;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });

  const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=512&height=512&nologo=true&seed=${seed || 0}&model=flux&nofeed=true&referrer=qroapp.vercel.app`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 28000);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) return res.status(response.status).json({ error: 'Failed', status: response.status });
    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buffer));
  } catch (e) {
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Timeout' });
    res.status(500).json({ error: e.message });
  }
}

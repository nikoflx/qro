export default async function handler(req, res) {
  const { prompt, seed } = req.query;
  if (!prompt) return res.status(400).json({ error: 'No prompt' });

  const token = process.env.HF_TOKEN;
  if (!token) return res.status(500).json({ error: 'HF_TOKEN not set in environment variables' });

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);

    const response = await fetch(
      'https://api-inference.huggingface.co/models/stabilityai/stable-diffusion-xl-base-1.0',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: { width: 512, height: 512, num_inference_steps: 20, seed: parseInt(seed) || 0 }
        }),
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (!response.ok) {
      const err = await response.text();
      return res.status(502).json({ error: 'HF failed', detail: err });
    }

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(Buffer.from(buffer));
  } catch (e) {
    if (e.name === 'AbortError') return res.status(504).json({ error: 'Timeout' });
    res.status(500).json({ error: 'Proxy error', detail: e.message });
  }
}

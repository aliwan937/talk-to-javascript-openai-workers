import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';

interface Env {
  OPENAI_API_KEY: string;
  SCRAPINGANT_API_KEY: string;
}

const app = new Hono<{ Bindings: Env }>();

app.use('/*', cors());

const DEFAULT_INSTRUCTIONS = `You are helpful and have some tools installed.

In the tools you have the ability to control a robot hand.
`;

// Scraping endpoint
app.post('/api/scrape', async (c) => {
  try {
    const { url } = await c.req.json();
    if (!url) {
      return c.json({ error: 'URL is required' }, 400);
    }
    const apiEndpoint = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${c.env.SCRAPINGANT_API_KEY}&browser=false&block_resource=stylesheet&block_resource=image&block_resource=media&block_resource=font&block_resource=texttrack&block_resource=xhr&block_resource=fetch&block_resource=eventsource&block_resource=websocket&block_resource=manifest`;
    const response = await fetch(apiEndpoint);
    const text = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    return c.json({ htmlContent: text });
  } catch (error) {
    console.error('Error in /api/scrape:', error);
    return c.json({ error: 'Failed to scrape the URL' }, 500);
  }
});

// OpenAI session endpoint
app.post('/api/session', async (c) => {
  try {
    const { instructions } = await c.req.json();
    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        instructions: instructions || DEFAULT_INSTRUCTIONS,
        voice: "alloy",
      }),
    });
    const text = await response.text();
    console.log('OpenAI response:', text);
    const result = JSON.parse(text);
    return c.json({ result });
  } catch (error) {
    console.error('Error in /api/session:', error);
    return c.json({ error: 'Failed to create OpenAI session' }, 500);
  }
});

// WebRTC signaling endpoint
app.post('/api/session/signal', async (c) => {
  try {
    const { sdp } = await c.req.json();
    const response = await fetch("https://api.openai.com/v1/realtime/sessions/signal", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${c.env.OPENAI_API_KEY}`,
        "Content-Type": "application/sdp",
      },
      body: sdp,
    });
    const answer = await response.text();
    return c.text(answer);
  } catch (error) {
    console.error('Error in /api/session/signal:', error);
    return c.text('Failed to signal OpenAI session', 500);
  }
});

export default app; 
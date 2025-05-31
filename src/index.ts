import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Context } from 'hono';

interface Env {
	OPENAI_API_KEY: string;
}

interface SessionResponse {
	id: string;
	model: string;
	created: number;
	// Add other fields as needed
}

const app = new Hono<{ Bindings: Env }>();
app.use(cors());

const DEFAULT_INSTRUCTIONS = `You are helpful and have some tools installed.

In the tools you have the ability to control a robot hand.
`;

// Learn more: https://platform.openai.com/docs/api-reference/realtime-sessions/create
app.get('/session', async (c: Context<{ Bindings: Env }>) => {
	const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
		method: "POST",
		headers: {
			"Authorization": `Bearer ${c.env.OPENAI_API_KEY}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			model: "gpt-4o-realtime-preview-2024-12-17",
			instructions: DEFAULT_INSTRUCTIONS,
			voice: "ash",
		}),
	});
	const result = await response.json() as SessionResponse;
	return c.json({ result });
});

export default app;

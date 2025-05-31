interface Env {
  SCRAPINGANT_API_KEY: string;
}

interface ScrapingAntResponse {
  content: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    // Only allow POST requests
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 });
    }

    try {
      // Parse the request body
      const body = await request.json() as { url: string };
      const { url } = body;

      if (!url) {
        return new Response('URL is required', { status: 400 });
      }

      // Build ScrapingAnt API endpoint with all required query parameters
      const apiEndpoint = `https://api.scrapingant.com/v2/general?url=${encodeURIComponent(url)}&x-api-key=${env.SCRAPINGANT_API_KEY}&browser=false&block_resource=stylesheet&block_resource=image&block_resource=media&block_resource=font&block_resource=texttrack&block_resource=xhr&block_resource=fetch&block_resource=eventsource&block_resource=websocket&block_resource=manifest`;

      const response = await fetch(apiEndpoint);
      const text = await response.text();
      console.log('ScrapingAnt response:', text);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${text}`);
      }
      // Return the HTML content directly
      return new Response(JSON.stringify({ htmlContent: text }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    } catch (error) {
      console.error('Error in worker:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to scrape the URL' }),
        { 
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          },
        }
      );
    }
  },
}; 
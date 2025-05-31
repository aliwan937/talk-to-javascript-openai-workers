import React, { useState, FormEvent, ChangeEvent } from 'react';
import './ScrapeForm.scss';
import { processHtmlContent } from '../../utils/processHtmlContent';

interface ScrapeFormProps {
  onScrapedContent: (content: string) => void;
}

export function ScrapeForm({ onScrapedContent }: ScrapeFormProps) {
  const [url, setUrl] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleUrlChange = (event: ChangeEvent<HTMLInputElement>) => {
    setUrl(event.target.value);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Call our Cloudflare Worker endpoint instead of directly calling ScrapingAnt
      const response = await fetch('/api/scrape', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json() as { htmlContent: string };
      const textContent = processHtmlContent(data.htmlContent);
      onScrapedContent(textContent);
    } catch (error) {
      console.error('Error while scraping:', error);
      setError('An error occurred during scraping');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="form-container">
      <form onSubmit={handleSubmit}>
        <input
          type="url"
          value={url}
          onChange={handleUrlChange}
          placeholder="Enter URL to scrape"
          required
          className="url-input"
        />
        <button type="submit" disabled={isLoading} className="submit-button">
          {isLoading ? 'Scraping...' : 'Scrape'}
        </button>
      </form>

      {error && <p className="error-message">{error}</p>}

      {!error && (
        <p className="instruction">
          Enter a URL and click 'Scrape' to get started.
        </p>
      )}
    </div>
  );
} 
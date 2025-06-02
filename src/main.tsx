import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ScrapeForm } from './components/ScrapeForm/ScrapeForm';
import { VoiceChat } from './pages/VoiceChat/VoiceChat';
import './index.css';

function App() {
  const [page, setPage] = useState<'scrape' | 'voice'>('scrape');
  const [scrapedContent, setScrapedContent] = useState<string>('');

  const handleScrapedContent = (content: string) => {
    setScrapedContent(content);
    setPage('voice');
  };

  return (
    <div className="app">
      <header>
        <h1>Web Scraper</h1>
      </header>
      <main>
        {page === 'scrape' && <ScrapeForm onScrapedContent={handleScrapedContent} />}
        {page === 'voice' && <VoiceChat scrapedContent={scrapedContent} />}
      </main>
      <footer>
        <p>Built with 🧡 on <a href="https://developers.cloudflare.com">Cloudflare Workers</a></p>
      </footer>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
); 
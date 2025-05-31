import React from 'react';
import ReactDOM from 'react-dom/client';
import { ScrapeForm } from './components/ScrapeForm/ScrapeForm';
import './index.css';

function App() {
  const handleScrapedContent = (content: string) => {
    console.log('Scraped content:', content);
    // Here you can handle the scraped content as needed
  };

  return (
    <div className="app">
      <header>
        <h1>Web Scraper</h1>
      </header>
      <main>
        <ScrapeForm onScrapedContent={handleScrapedContent} />
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
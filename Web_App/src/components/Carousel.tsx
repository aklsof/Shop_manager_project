'use client';

import { useAllRssFeeds } from './RssFeed';

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  thumbnail?: string;
}

function extractImageFromHtml(html: string): string {
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const img = div.querySelector('img');
  return img ? img.src : '';
}

function extractSnippet(html: string, wordCount = 30): { snippet: string; ellipsis: string } {
  if (typeof window === 'undefined') return { snippet: '', ellipsis: '' };
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  return {
    snippet: words.slice(0, wordCount).join(' '),
    ellipsis: words.length > wordCount ? '...' : '',
  };
}

/**
 * Carousel component — TypeScript equivalent of include/carousel.php
 * Combines all RSS feeds, sorts by date, renders Bootstrap 5 carousel.
 */
export default function Carousel() {
  const { posts, ready } = useAllRssFeeds();

  if (!ready) {
    return (
      <div className="loading-spinner">
        <p className="text-primary animate-pulse">Loading post content...</p>
      </div>
    );
  }

  // Combine all feeds and sort by date descending (mirrors carousel.php logic)
  const allPosts: RssItem[] = [
    ...posts.tv,
    ...posts.mobile,
    ...posts.sport,
    ...posts.video,
  ].sort((a, b) => {
    const dateA = new Date(a.pubDate || 0).getTime();
    const dateB = new Date(b.pubDate || 0).getTime();
    return dateB - dateA;
  });

  if (allPosts.length === 0) {
    return (
      <div className="post-container p-6 bg-white rounded-lg shadow-md border border-gray-200">
        <p className="text-gray-600 text-center">No posts found in any of the RSS feeds.</p>
      </div>
    );
  }

  const uniqueId = 'carousel-main';
  const placeholder = 'https://placehold.co/600x300/cccccc/ffffff?text=No+Image';

  return (
    <div id={uniqueId} className="carousel slide" data-bs-ride="carousel">
      {/* Indicators */}
      {allPosts.length > 1 && (
        <div className="carousel-indicators">
          {allPosts.map((_, i) => (
            <button
              key={i}
              type="button"
              data-bs-target={`#${uniqueId}`}
              data-bs-slide-to={i}
              className={i === 0 ? 'active' : ''}
              aria-current={i === 0 ? 'true' : 'false'}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}

      {/* Slides */}
      <div className="carousel-inner">
        {allPosts.map((item, i) => {
          const imageUrl = item.thumbnail || extractImageFromHtml(item.description) || placeholder;
          const { snippet, ellipsis } = extractSnippet(item.description, 30);
          return (
            <div key={i} className={`carousel-item${i === 0 ? ' active' : ''}`}>
              <div className="d-block w-100 bg-light p-4 rounded-3 shadow-sm">
                <div
                  className="carousel-image-bg rounded-3 mb-3"
                  style={{
                    backgroundImage: `url('${imageUrl}')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    height: 200,
                  }}
                />
                <h5 className="post-title mb-2">
                  <a href={item.link || '#'} target="_blank" rel="noreferrer" className="text-decoration-none text-dark">
                    {item.title || 'No Title Available'}
                  </a>
                </h5>
                <p className="post-content text-secondary">{snippet}{ellipsis}</p>
                <a href={item.link || '#'} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm mt-2">
                  Read More
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      {allPosts.length > 1 && (
        <>
          <button className="carousel-control-prev" type="button" data-bs-target={`#${uniqueId}`} data-bs-slide="prev">
            <span className="carousel-control-prev-icon" aria-hidden="true" />
            <span className="visually-hidden">Previous</span>
          </button>
          <button className="carousel-control-next" type="button" data-bs-target={`#${uniqueId}`} data-bs-slide="next">
            <span className="carousel-control-next-icon" aria-hidden="true" />
            <span className="visually-hidden">Next</span>
          </button>
        </>
      )}
    </div>
  );
}

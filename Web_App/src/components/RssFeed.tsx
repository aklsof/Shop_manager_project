'use client';

import { useEffect, useState } from 'react';

interface RssItem {
  title: string;
  link: string;
  description: string;
  pubDate?: string;
  thumbnail?: string;
}

interface RssApiResponse {
  status: string;
  items?: RssItem[];
}

const FEED_URLS: Record<string, string> = {
  tv: 'https://aklsoftv.blogspot.com/feeds/posts/default?alt=rss',
  mobile: 'https://mobile-aklsof.blogspot.com/feeds/posts/default?alt=rss',
  sport: 'https://sportsof.blogspot.com/feeds/posts/default?alt=rss',
  video: 'https://aklsofvideos.blogspot.com/feeds/posts/default?alt=rss',
};

/**
 * Fetch a single RSS feed via rss2json proxy with retry logic.
 * TypeScript equivalent of the retryFetch logic in javascript.js
 */
async function fetchFeedWithRetry(key: string, attempts = 3): Promise<RssItem[]> {
  const url = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(FEED_URLS[key])}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data: RssApiResponse = await res.json();
    if (data.status === 'ok' && data.items && data.items.length > 0) {
      return data.items;
    }
    throw new Error('No items or bad status');
  } catch (err) {
    if (attempts > 1) {
      await new Promise((r) => setTimeout(r, 1000));
      return fetchFeedWithRetry(key, attempts - 1);
    }
    console.error(`Failed to load ${key} feed:`, err);
    return [];
  }
}

export type FeedKey = 'tv' | 'mobile' | 'sport' | 'video';

export interface AllPosts {
  tv: RssItem[];
  mobile: RssItem[];
  sport: RssItem[];
  video: RssItem[];
}

/**
 * Hook that fetches all 4 RSS feeds and returns them.
 * Equivalent of the window.allRssPosts global set by javascript.js
 */
export function useAllRssFeeds(): { posts: AllPosts; ready: boolean } {
  const [posts, setPosts] = useState<AllPosts>({ tv: [], mobile: [], sport: [], video: [] });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    Promise.all([
      fetchFeedWithRetry('tv'),
      fetchFeedWithRetry('mobile'),
      fetchFeedWithRetry('sport'),
      fetchFeedWithRetry('video'),
    ]).then(([tv, mobile, sport, video]) => {
      setPosts({ tv, mobile, sport, video });
      setReady(true);
    });
  }, []);

  return { posts, ready };
}

function extractImageFromHtml(html: string): string {
  if (typeof window === 'undefined') return '';
  const div = document.createElement('div');
  div.innerHTML = html;
  const img = div.querySelector('img');
  return img ? img.src : '';
}

function extractText(html: string, words = 15): { snippet: string; ellipsis: string } {
  if (typeof window === 'undefined') return { snippet: '', ellipsis: '' };
  const div = document.createElement('div');
  div.innerHTML = html;
  const text = div.textContent || div.innerText || '';
  const ws = text.split(/\s+/).filter((w) => w.length > 0);
  return {
    snippet: ws.slice(0, words).join(' '),
    ellipsis: ws.length > words ? '...' : '',
  };
}

interface RssFeedProps {
  title: string;
  feedKey: FeedKey;
  items: RssItem[];
  ready: boolean;
}

/**
 * Generic RSS feed section component.
 * Equivalent of include/tv.php, mobile.php, sport.php, video.php
 */
export default function RssFeed({ title, feedKey, items, ready }: RssFeedProps) {
  const placeholder = 'https://placehold.co/50x50/cccccc/ffffff?text=X';

  return (
    <div className="container mx-auto p-4 bg-white rounded-lg shadow-lg max-w-lg w-full">
      <h1 className="text-lg font-bold text-center text-gray-800 mb-8 rounded-lg p-2 bg-blue-100 shadow-md">
        {title}
      </h1>
      <div id={`${feedKey}postOutput`} className="text-gray-700 text-lg">
        {!ready ? (
          <div className="loading-spinner">
            <p className="text-primary animate-pulse">Loading post content...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="post-container p-6 bg-white rounded-lg shadow-md border border-gray-200">
            <p className="text-gray-600 text-center">No posts found for {title}.</p>
          </div>
        ) : (
          items.slice(0, 4).map((item, i) => {
            const imageUrl = item.thumbnail || extractImageFromHtml(item.description) || placeholder;
            const { snippet, ellipsis } = extractText(item.description, 15);
            return (
              <div key={i} className="post-container p-4 bg-white rounded-md shadow-md border border-gray-200 mb-4">
                <div className="flex items-start space-x-3">
                  <img
                    src={imageUrl}
                    alt="Post image"
                    className="w-50 h-50 rounded-full object-cover flex-shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = placeholder; }}
                    style={{ width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                  />
                  <div>
                    <h2 className="post-title text-md font-semibold text-gray-800 mb-1">
                      <a href={item.link || '#'} target="_blank" rel="noreferrer" className="text-gray-800 hover:underline">
                        {item.title || 'No Title Available'}
                      </a>
                    </h2>
                    <p className="post-content text-gray-800 leading-relaxed text-sm">{snippet}{ellipsis}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

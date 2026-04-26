import { useState, useEffect, useCallback } from 'react';
import api from '../api/api';

export const useWatchlistEnhancements = (stocks = []) => {
  const [newsData, setNewsData] = useState({});
  const [readArticles, setReadArticles] = useState(new Set());
  const [viewMode, setViewMode] = useState('expanded'); // 'compact' | 'expanded'
  const [showOnlyWithNews, setShowOnlyWithNews] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    const savedReadArticles = localStorage.getItem('watchlist_read_articles');
    if (savedReadArticles) {
      try {
        setReadArticles(new Set(JSON.parse(savedReadArticles)));
      } catch (e) {
        console.error('Failed to load read articles:', e);
      }
    }

    const savedViewMode = localStorage.getItem('watchlist_view_mode');
    if (savedViewMode) {
      setViewMode(savedViewMode);
    }
  }, []);

  const markArticleAsRead = useCallback((articleId) => {
    setReadArticles((prev) => {
      const next = new Set(prev);
      next.add(articleId);
      localStorage.setItem('watchlist_read_articles', JSON.stringify(Array.from(next)));
      return next;
    });
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode((prev) => {
      const next = prev === 'compact' ? 'expanded' : 'compact';
      localStorage.setItem('watchlist_view_mode', next);
      return next;
    });
  }, []);

  const requestNotificationPermission = useCallback(async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setNotificationsEnabled(true);
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      const enabled = permission === 'granted';
      setNotificationsEnabled(enabled);
      return enabled;
    }

    return false;
  }, []);

  const sendNotification = useCallback((title, options = {}) => {
    if (!notificationsEnabled || Notification.permission !== 'granted') {
      return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/favicon.ico',
        badge: '/favicon.ico',
        ...options,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };
    } catch (e) {
      console.error('Failed to send notification:', e);
    }
  }, [notificationsEnabled]);

  const exportToCSV = useCallback((stockList, newsInfo) => {
    if (!stockList || stockList.length === 0) {
      alert('No stocks to export');
      return;
    }

    const headers = [
      'Symbol', 'Name', 'Price', 'Change', '% Change', 'Volume',
      'Market Cap', 'RSI', 'MACD', '52W High', '52W Low', 'VWAP',
      'News Count', 'Sentiment Score', 'Has News Today',
    ];

    const rows = stockList.map((stock) => {
      const news = newsInfo[stock.symbol] || {};
      return [
        stock.symbol, stock.name, stock.price, stock.change, stock.percent,
        stock.volume, stock.marketCap, stock.rsi, stock.macd,
        stock.high52w, stock.low52w, stock.vwap,
        news.count || 0, news.sentiment || 0, news.hasToday ? 'Yes' : 'No',
      ];
    });

    const csvContent = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `watchlist_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const getNewsInfo = useCallback((symbol) => {
    return newsData[symbol] || { count: 0, sentiment: 0, hasToday: false, unread: 0 };
  }, [newsData]);

  const getUnreadCount = useCallback((symbol) => {
    const news = newsData[symbol];
    return news?.unread || 0;
  }, [newsData]);

  // Live news sentiment fetch — replaces Math.random() simulation
  const symbolKey = stocks.map(s => s.symbol).join(',');
  useEffect(() => {
    if (!stocks || stocks.length === 0) return;
    let active = true;

    const fetchNewsSentiment = async () => {
      try {
        const results = await Promise.allSettled(
          stocks.map(s =>
            api.get(`/market/news?symbol=${encodeURIComponent(s.symbol)}&limit=5`)
              .then(res => ({
                symbol: s.symbol,
                articles: res.data?.articles ?? res.data?.news ?? (Array.isArray(res.data) ? res.data : []),
              }))
          )
        );

        if (!active) return;

        const nextData = {};
        const todayStr = new Date().toDateString();
        results.forEach(r => {
          if (r.status !== 'fulfilled') return;
          const { symbol, articles } = r.value;
          const hasToday = articles.some(a => a.publishedAt && new Date(a.publishedAt).toDateString() === todayStr);
          let sentimentScore = 0;
          articles.forEach(a => {
            const t = String(a.title || '').toLowerCase();
            if (t.match(/gain|rise|buy|surge|jump|record|bull/)) sentimentScore += 10;
            if (t.match(/fall|drop|loss|decline|bear|crash|weak/)) sentimentScore -= 10;
          });
          nextData[symbol] = { count: articles.length, sentiment: sentimentScore, hasToday, unread: articles.length };
        });

        setNewsData(prev => ({ ...prev, ...nextData }));
      } catch (err) {
        console.warn('useWatchlistEnhancements news fetch failed:', err.message);
      }
    };

    fetchNewsSentiment();
    const interval = setInterval(fetchNewsSentiment, 60000);
    return () => { active = false; clearInterval(interval); };
  }, [symbolKey]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    newsData,
    getNewsInfo,
    getUnreadCount,
    readArticles,
    markArticleAsRead,
    viewMode,
    toggleViewMode,
    showOnlyWithNews,
    setShowOnlyWithNews,
    notificationsEnabled,
    requestNotificationPermission,
    sendNotification,
    exportToCSV,
  };
};

export default useWatchlistEnhancements;

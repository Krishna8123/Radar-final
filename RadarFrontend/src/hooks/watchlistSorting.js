

export const SORT_TYPES = {
  PRICE_ASC: 'price_asc',
  PRICE_DESC: 'price_desc',
  CHANGE_ASC: 'change_asc',
  CHANGE_DESC: 'change_desc',
  PERCENT_ASC: 'percent_asc',
  PERCENT_DESC: 'percent_desc',
  VOLUME_ASC: 'volume_asc',
  VOLUME_DESC: 'volume_desc',
  RSI_ASC: 'rsi_asc',
  RSI_DESC: 'rsi_desc',
  
  NEWS_COUNT_DESC: 'news_count_desc',
  NEWS_COUNT_ASC: 'news_count_asc',
  SENTIMENT_DESC: 'sentiment_desc',
  SENTIMENT_ASC: 'sentiment_asc',
  SENTIMENT_CHANGE_DESC: 'sentiment_change_desc',
  UNREAD_DESC: 'unread_desc',
};

export const SORT_OPTIONS = [
  { value: SORT_TYPES.PRICE_DESC, label: 'Price: High to Low', icon: '↓' },
  { value: SORT_TYPES.PRICE_ASC, label: 'Price: Low to High', icon: '↑' },
  { value: SORT_TYPES.CHANGE_DESC, label: 'Change: High to Low', icon: '↓' },
  { value: SORT_TYPES.CHANGE_ASC, label: 'Change: Low to High', icon: '↑' },
  { value: SORT_TYPES.PERCENT_DESC, label: '% Change: High to Low', icon: '↓' },
  { value: SORT_TYPES.PERCENT_ASC, label: '% Change: Low to High', icon: '↑' },
  { value: SORT_TYPES.VOLUME_DESC, label: 'Volume: High to Low', icon: '↓' },
  { value: SORT_TYPES.VOLUME_ASC, label: 'Volume: Low to High', icon: '↑' },
  { value: SORT_TYPES.RSI_DESC, label: 'RSI: High to Low', icon: '↓' },
  { value: SORT_TYPES.RSI_ASC, label: 'RSI: Low to High', icon: '↑' },
  { value: SORT_TYPES.NEWS_COUNT_DESC, label: 'News Volume: High to Low', icon: '📰↓', new: true },
  { value: SORT_TYPES.NEWS_COUNT_ASC, label: 'News Volume: Low to High', icon: '📰↑', new: true },
  { value: SORT_TYPES.SENTIMENT_DESC, label: 'Sentiment: Positive First', icon: '😊↓', new: true },
  { value: SORT_TYPES.SENTIMENT_ASC, label: 'Sentiment: Negative First', icon: '😞↑', new: true },
  { value: SORT_TYPES.UNREAD_DESC, label: 'Unread News: Most First', icon: '📖↓', new: true },
];

export const sortStocks = (stocks, sortType, newsData = {}) => {
  if (!stocks || stocks.length === 0) return stocks;

  const sorted = [...stocks];

  switch (sortType) {
    case SORT_TYPES.PRICE_ASC:
      return sorted.sort((a, b) => (a.price || 0) - (b.price || 0));
    
    case SORT_TYPES.PRICE_DESC:
      return sorted.sort((a, b) => (b.price || 0) - (a.price || 0));
    
    case SORT_TYPES.CHANGE_ASC:
      return sorted.sort((a, b) => (a.change || 0) - (b.change || 0));
    
    case SORT_TYPES.CHANGE_DESC:
      return sorted.sort((a, b) => (b.change || 0) - (a.change || 0));
    
    case SORT_TYPES.PERCENT_ASC:
      return sorted.sort((a, b) => (a.percent || 0) - (b.percent || 0));
    
    case SORT_TYPES.PERCENT_DESC:
      return sorted.sort((a, b) => (b.percent || 0) - (a.percent || 0));
    
    case SORT_TYPES.VOLUME_ASC:
      return sorted.sort((a, b) => (a.volume || 0) - (b.volume || 0));
    
    case SORT_TYPES.VOLUME_DESC:
      return sorted.sort((a, b) => (b.volume || 0) - (a.volume || 0));
    
    case SORT_TYPES.RSI_ASC:
      return sorted.sort((a, b) => (a.rsi || 0) - (b.rsi || 0));
    
    case SORT_TYPES.RSI_DESC:
      return sorted.sort((a, b) => (b.rsi || 0) - (a.rsi || 0));
    
    case SORT_TYPES.NEWS_COUNT_DESC:
      return sorted.sort((a, b) => {
        const aCount = newsData[a.symbol]?.count || 0;
        const bCount = newsData[b.symbol]?.count || 0;
        return bCount - aCount;
      });
    
    case SORT_TYPES.NEWS_COUNT_ASC:
      return sorted.sort((a, b) => {
        const aCount = newsData[a.symbol]?.count || 0;
        const bCount = newsData[b.symbol]?.count || 0;
        return aCount - bCount;
      });
    
    case SORT_TYPES.SENTIMENT_DESC:
      return sorted.sort((a, b) => {
        const aSentiment = newsData[a.symbol]?.sentiment || 0;
        const bSentiment = newsData[b.symbol]?.sentiment || 0;
        return bSentiment - aSentiment;
      });
    
    case SORT_TYPES.SENTIMENT_ASC:
      return sorted.sort((a, b) => {
        const aSentiment = newsData[a.symbol]?.sentiment || 0;
        const bSentiment = newsData[b.symbol]?.sentiment || 0;
        return aSentiment - bSentiment;
      });
    
    case SORT_TYPES.UNREAD_DESC:
      return sorted.sort((a, b) => {
        const aUnread = newsData[a.symbol]?.unread || 0;
        const bUnread = newsData[b.symbol]?.unread || 0;
        return bUnread - aUnread;
      });
    
    default:
      return sorted;
  }
};

export const getSentimentColor = (sentiment) => {
  if (sentiment > 50) return 'text-emerald-400';
  if (sentiment > 20) return 'text-green-400';
  if (sentiment > -20) return 'text-yellow-400';
  if (sentiment > -50) return 'text-orange-400';
  return 'text-rose-400';
};

export const getSentimentBgColor = (sentiment) => {
  if (sentiment > 50) return 'bg-emerald-500/20 border-emerald-500/30';
  if (sentiment > 20) return 'bg-green-500/20 border-green-500/30';
  if (sentiment > -20) return 'bg-yellow-500/20 border-yellow-500/30';
  if (sentiment > -50) return 'bg-orange-500/20 border-orange-500/30';
  return 'bg-rose-500/20 border-rose-500/30';
};

export const getSentimentLabel = (sentiment) => {
  if (sentiment > 50) return 'Very Positive';
  if (sentiment > 20) return 'Positive';
  if (sentiment > -20) return 'Neutral';
  if (sentiment > -50) return 'Negative';
  return 'Very Negative';
};

export default sortStocks;

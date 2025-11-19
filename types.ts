export interface StockData {
  ticker: string;
  companyName: string;
  currentPrice: number;
  currency: string;
  highPrice: number; // 52-week high or ATH depending on search context
  highType: '52-Week' | 'ATH';
  rsi: number | null;
  rsiHistory: number[];
  priceHistory: { date: string; price: number }[];
  lastUpdated: string;
  sources: string[];
}

export interface DipScenario {
  percentage: number;
  price: number;
  note: string;
}

export interface MarketStatus {
  status: 'loading' | 'idle' | 'success' | 'error';
  message?: string;
}

export interface WatchlistItem {
  ticker: string;
  price: number;
  currency: string;
  change: number;
  sparkline: number[];
}

export interface Theme {
  id: string;
  name: string;
  colors: {
    primary: string;
    accent: string;
    glowStart: string;
    glowEnd: string;
  };
}
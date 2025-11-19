import React from 'react';
import { Trash2, TrendingUp, TrendingDown, RefreshCw } from './Icons';
import { WatchlistItem } from '../types';

interface WatchlistProps {
  items: WatchlistItem[];
  isLoading: boolean;
  onRemove: (ticker: string) => void;
  onSelect: (ticker: string) => void;
  onRefresh: () => void;
}

const Sparkline: React.FC<{ data: number[]; color: string }> = ({ data, color }) => {
  if (!data || data.length < 2) return null;

  const width = 100;
  const height = 40;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1; // Avoid division by zero

  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * width;
    // Invert Y because SVG origin is top-left
    const y = height - ((val - min) / range) * (height - 10) - 5; // Add 5px padding
    return `${x},${y}`;
  }).join(' ');

  const fillPath = `${points} ${width},${height} 0,${height}`;

  return (
    <div className="w-24 h-10 relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.3" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={`M ${fillPath}`} fill={`url(#grad-${color})`} />
        <polyline 
          points={points} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
};

const Watchlist: React.FC<WatchlistProps> = ({ items, isLoading, onRemove, onSelect, onRefresh }) => {
  if (items.length === 0) return null;

  return (
    <div className="w-full max-w-5xl mx-auto mb-8 animate-fade-in">
      <div className="flex items-center justify-between mb-3 px-1">
        <h3 className="text-slate-400 text-sm font-medium uppercase tracking-wider">My Watchlist</h3>
        <button 
          onClick={onRefresh} 
          disabled={isLoading}
          className={`text-slate-500 hover:text-blue-400 transition-colors p-1 rounded-md hover:bg-slate-800 ${isLoading ? 'animate-spin' : ''}`}
          title="Refresh Watchlist"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {items.map((item) => {
          const isPositive = item.change >= 0;
          const color = isPositive ? '#34d399' : '#fb7185'; // emerald-400 : rose-400
          
          return (
            <div 
              key={item.ticker}
              onClick={() => onSelect(item.ticker)}
              className="bg-slate-800/40 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 rounded-xl p-4 cursor-pointer transition-all group relative overflow-hidden flex flex-col justify-between h-28"
            >
              <div className="flex justify-between items-start z-10">
                <div>
                  <span className="font-bold text-white tracking-tight block">{item.ticker}</span>
                  <div className={`flex items-center gap-1 text-xs font-medium mt-0.5 ${isPositive ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                    <span>{item.change > 0 ? '+' : ''}{item.change}%</span>
                  </div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove(item.ticker);
                  }}
                  className="text-slate-600 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-2 -mt-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="flex items-end justify-between relative z-10 mt-auto">
                <span className="text-lg font-mono text-slate-200 leading-none">
                   {item.price.toLocaleString()} 
                   <span className="text-[10px] text-slate-500 ml-1">{item.currency}</span>
                </span>
                <div className="absolute right-[-10px] bottom-[-10px] opacity-50 group-hover:opacity-100 transition-opacity">
                   <Sparkline data={item.sparkline} color={color} />
                </div>
              </div>

              {/* Ambient Glow */}
              <div className={`absolute -bottom-8 -right-8 w-24 h-24 rounded-full blur-2xl opacity-5 transition-opacity group-hover:opacity-10 ${isPositive ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Watchlist;
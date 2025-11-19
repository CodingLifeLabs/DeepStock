import React, { useState, FormEvent, useEffect } from 'react';
import { Search, RefreshCw, ExternalLink, Palette, Check } from './components/Icons';
import { fetchStockAnalysis } from './services/geminiService';
import { StockData, MarketStatus, Theme } from './types';
import AnalysisCard from './components/AnalysisCard';
import DipCalculator from './components/DipCalculator';

const THEMES: Theme[] = [
  {
    id: 'ocean',
    name: 'Ocean',
    colors: {
      primary: '#3b82f6',
      accent: '#a855f7',
      glowStart: 'rgba(30, 58, 138, 0.2)',
      glowEnd: 'rgba(88, 28, 135, 0.1)'
    }
  },
  {
    id: 'forest',
    name: 'Forest',
    colors: {
      primary: '#10b981', // emerald-500
      accent: '#14b8a6',  // teal-500
      glowStart: 'rgba(6, 78, 59, 0.2)',
      glowEnd: 'rgba(19, 78, 74, 0.1)'
    }
  },
  {
    id: 'sunset',
    name: 'Sunset',
    colors: {
      primary: '#f59e0b', // amber-500
      accent: '#f43f5e',  // rose-500
      glowStart: 'rgba(120, 53, 15, 0.2)',
      glowEnd: 'rgba(136, 19, 55, 0.1)'
    }
  },
  {
    id: 'neon',
    name: 'Neon',
    colors: {
      primary: '#d946ef', // fuchsia-500
      accent: '#06b6d4',  // cyan-500
      glowStart: 'rgba(112, 26, 117, 0.2)',
      glowEnd: 'rgba(21, 94, 117, 0.1)'
    }
  }
];

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [status, setStatus] = useState<MarketStatus>({ status: 'idle' });
  
  const [currentTheme, setCurrentTheme] = useState<Theme>(THEMES[0]);
  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);

  // Apply theme CSS variables when currentTheme changes
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--primary', currentTheme.colors.primary);
    root.style.setProperty('--accent', currentTheme.colors.accent);
    root.style.setProperty('--glow-start', currentTheme.colors.glowStart);
    root.style.setProperty('--glow-end', currentTheme.colors.glowEnd);
  }, [currentTheme]);

  const handleSearch = async (e: FormEvent | null) => {
    if (e) e.preventDefault();
    
    if (!ticker.trim()) return;

    setStatus({ status: 'loading' });
    setStockData(null);

    try {
      const data = await fetchStockAnalysis(ticker);
      setStockData(data);
      setStatus({ status: 'success' });
    } catch (error: any) {
      setStatus({ 
        status: 'error', 
        message: error.message || '데이터를 불러오는 중 문제가 발생했습니다. 티커를 확인해주세요.' 
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-primary/30 selection:text-primary pb-20 transition-colors duration-500">
      {/* Background Gradients - Dynamic based on theme */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden transition-all duration-700">
        <div 
          className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-700"
          style={{ backgroundColor: currentTheme.colors.glowStart }}
        ></div>
        <div 
          className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full blur-[120px] transition-colors duration-700"
          style={{ backgroundColor: currentTheme.colors.glowEnd }}
        ></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-16">
        
        {/* Theme Switcher */}
        <div className="absolute top-6 right-6 md:top-8 md:right-8 z-50">
          <div className="relative">
            <button 
              onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
              className="p-2 rounded-full bg-slate-800/50 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition-colors backdrop-blur-sm"
              title="Change Theme"
            >
              <Palette className="w-5 h-5" />
            </button>
            
            {isThemeMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsThemeMenuOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-xl overflow-hidden z-50 animate-fade-in">
                  {THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => {
                        setCurrentTheme(theme);
                        setIsThemeMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm flex items-center justify-between hover:bg-slate-800 transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <span 
                          className="w-3 h-3 rounded-full" 
                          style={{ background: `linear-gradient(135deg, ${theme.colors.primary}, ${theme.colors.accent})` }}
                        ></span>
                        <span className={currentTheme.id === theme.id ? 'text-white font-medium' : 'text-slate-400'}>
                          {theme.name}
                        </span>
                      </span>
                      {currentTheme.id === theme.id && <Check className="w-3.5 h-3.5 text-primary" />}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Header & Search */}
        <div className={`transition-all duration-700 ease-out flex flex-col items-center ${stockData ? 'mb-8' : 'min-h-[60vh] justify-center'}`}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-2 bg-slate-800/50 rounded-full mb-4 ring-1 ring-slate-700 backdrop-blur-md">
              <span className="text-xs font-semibold text-primary px-2 transition-colors">AI Powered Analytics</span>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 mb-3 tracking-tight">
              Stock Deep Dive
            </h1>
            {!stockData && (
              <p className="text-slate-400 text-lg max-w-md mx-auto">
                AI를 통해 주가 하락폭, RSI, 그리고 저점 매수 구간을 실시간으로 분석합니다.
              </p>
            )}
          </div>

          <form onSubmit={(e) => handleSearch(e)} className="w-full max-w-lg relative group z-20">
            <div className="absolute inset-0 bg-gradient-to-r from-primary to-accent rounded-xl opacity-20 group-hover:opacity-30 blur transition-all duration-500"></div>
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden focus-within:border-primary transition-colors duration-300">
              <Search className="w-6 h-6 text-slate-500 ml-4" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="티커 입력 (예: TSLA, AAPL, NVDA)"
                className="w-full bg-transparent border-none text-white px-4 py-4 focus:outline-none text-lg placeholder:text-slate-600"
              />
              <button 
                type="submit"
                disabled={status.status === 'loading'}
                className="bg-primary hover:bg-primary/90 text-white font-medium px-6 py-2 mr-2 rounded-lg transition-colors disabled:opacity-50"
              >
                {status.status === 'loading' ? <RefreshCw className="w-5 h-5 animate-spin" /> : '분석'}
              </button>
            </div>
          </form>

          {/* Loading State */}
          {status.status === 'loading' && (
             <div className="mt-12 flex flex-col items-center space-y-4 animate-fade-in">
               <div className="w-full max-w-md space-y-3">
                 <div className="h-4 bg-slate-800 rounded animate-pulse w-3/4 mx-auto"></div>
                 <div className="h-4 bg-slate-800 rounded animate-pulse w-1/2 mx-auto"></div>
               </div>
               <p className="text-sm text-slate-500 font-mono animate-pulse">Gemini가 최신 시장 데이터를 검색 중입니다...</p>
             </div>
          )}

          {/* Error Message */}
          {status.status === 'error' && (
            <div className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 animate-fade-in">
              {status.message}
            </div>
          )}
        </div>

        {/* Main Result View */}
        {stockData && status.status === 'success' && (
          <div className="animate-slide-up space-y-6">
            
            {/* Header Card */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                   <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    {stockData.ticker}
                  </h2>
                </div>
                <span className="text-lg font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded">{stockData.companyName}</span>
                <p className="text-slate-400 text-sm mt-2">Updated: {stockData.lastUpdated}</p>
              </div>

              <div className="flex flex-col items-end gap-2">
                <div className="text-right mt-2">
                  <div className="text-sm text-slate-400 mb-1">현재 주가</div>
                  <div className="text-5xl font-bold text-white tracking-tight">
                    <span className="text-2xl text-slate-500 mr-1">{stockData.currency}</span>
                    {stockData.currentPrice.toLocaleString()}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Grid */}
            <AnalysisCard data={stockData} theme={currentTheme} />

            {/* Dip Calculator Table */}
            <DipCalculator data={stockData} />

            {/* Sources Footer */}
            {stockData.sources.length > 0 && (
              <div className="mt-12 pt-6 border-t border-slate-800">
                <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                  <Search className="w-3 h-3" /> 출처 (Grounding)
                </h4>
                <div className="flex flex-wrap gap-2">
                  {stockData.sources.map((source, idx) => (
                    <a 
                      key={idx} 
                      href={source} 
                      target="_blank" 
                      rel="noreferrer"
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-primary px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 truncate max-w-[200px]"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {new URL(source).hostname.replace('www.', '')}
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
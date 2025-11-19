import React, { useState, FormEvent } from 'react';
import { Search, RefreshCw, ExternalLink, TrendingUp, Plus, X } from './components/Icons';
import { fetchStockAnalysis } from './services/geminiService';
import { StockData, MarketStatus } from './types';
import AnalysisCard from './components/AnalysisCard';
import DipCalculator from './components/DipCalculator';

const App: React.FC = () => {
  const [ticker, setTicker] = useState('');
  const [stockData, setStockData] = useState<StockData | null>(null);
  const [status, setStatus] = useState<MarketStatus>({ status: 'idle' });

  // Comparison State
  const [compTicker, setCompTicker] = useState('');
  const [comparisonData, setComparisonData] = useState<StockData | null>(null);
  const [compStatus, setCompStatus] = useState<MarketStatus>({ status: 'idle' });

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!ticker.trim()) return;

    setStatus({ status: 'loading' });
    setStockData(null);
    setComparisonData(null); // Reset comparison on new main search
    setCompTicker('');

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

  const handleCompare = async (e: FormEvent) => {
    e.preventDefault();
    if (!compTicker.trim()) return;
    
    setCompStatus({ status: 'loading' });

    try {
      const data = await fetchStockAnalysis(compTicker);
      setComparisonData(data);
      setCompStatus({ status: 'success' });
    } catch (error: any) {
      setCompStatus({ 
        status: 'error', 
        message: '비교 데이터 로드 실패'
      });
      alert('비교 대상을 찾을 수 없습니다.');
    }
  };

  const removeComparison = () => {
    setComparisonData(null);
    setCompTicker('');
    setCompStatus({ status: 'idle' });
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 selection:bg-blue-500/30 selection:text-blue-200 pb-20">
      {/* Background Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/10 rounded-full blur-[120px]"></div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 md:pt-16">
        
        {/* Header & Search */}
        <div className={`transition-all duration-700 ease-out flex flex-col items-center ${stockData ? 'mb-8' : 'min-h-[60vh] justify-center'}`}>
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center p-2 bg-slate-800/50 rounded-full mb-4 ring-1 ring-slate-700 backdrop-blur-md">
              <span className="text-xs font-semibold text-blue-400 px-2">AI Powered Analytics</span>
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

          <form onSubmit={handleSearch} className="w-full max-w-lg relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl opacity-20 group-hover:opacity-30 blur transition-opacity"></div>
            <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden focus-within:border-blue-500 transition-colors">
              <Search className="w-6 h-6 text-slate-500 ml-4" />
              <input
                type="text"
                value={ticker}
                onChange={(e) => setTicker(e.target.value)}
                placeholder="티커 입력 (예: TSLA, AAPL, NVDA)"
                className="w-full bg-transparent border-none text-white px-4 py-4 focus:outline-none text-lg placeholder:text-slate-600"
              />
              <button 
                type="button"
                disabled={status.status === 'loading'}
                onClick={handleSearch}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium px-6 py-2 mr-2 rounded-lg transition-colors disabled:opacity-50"
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
            
            {/* Header Card with Comparison Input */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 pb-6 border-b border-slate-800">
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  {stockData.ticker}
                  <span className="text-lg font-normal text-slate-500 px-2 py-0.5 bg-slate-800 rounded">{stockData.companyName}</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">Updated: {stockData.lastUpdated}</p>
              </div>

              {/* Comparison Controls */}
              <div className="flex flex-col items-end gap-2">
                {!comparisonData ? (
                  <form onSubmit={handleCompare} className="flex items-center gap-2">
                    <div className="relative flex items-center bg-slate-900 border border-slate-700 rounded-lg focus-within:border-blue-500 transition-colors">
                      <span className="text-slate-500 text-xs pl-3 font-medium">VS</span>
                      <input
                         type="text"
                         value={compTicker}
                         onChange={(e) => setCompTicker(e.target.value)}
                         placeholder="Compare..."
                         className="bg-transparent border-none text-white text-sm px-3 py-1.5 w-32 focus:outline-none placeholder:text-slate-600"
                      />
                      <button 
                        type="submit"
                        disabled={compStatus.status === 'loading'}
                        className="p-1.5 hover:bg-slate-800 rounded-r-lg text-blue-400 transition-colors"
                      >
                         {compStatus.status === 'loading' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                      </button>
                    </div>
                  </form>
                ) : (
                   <div className="flex items-center gap-3 bg-slate-900/50 border border-slate-700 rounded-lg px-3 py-1.5">
                      <span className="text-xs text-slate-500 font-bold">VS</span>
                      <span className="text-sm font-bold text-emerald-400">{comparisonData.ticker}</span>
                      <button onClick={removeComparison} className="text-slate-500 hover:text-white transition-colors">
                        <X className="w-4 h-4" />
                      </button>
                   </div>
                )}

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
            <AnalysisCard data={stockData} comparisonData={comparisonData} />

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
                      className="text-xs bg-slate-800 hover:bg-slate-700 text-blue-400 px-3 py-1.5 rounded-full transition-colors flex items-center gap-1 truncate max-w-[200px]"
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
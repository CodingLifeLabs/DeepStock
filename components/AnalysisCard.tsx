import React, { useState, useRef, useMemo, useEffect } from 'react';
import { Activity, TrendingDown, TrendingUp, AlertCircle, TrendingUp as TrendingIcon, RefreshCw } from './Icons';
import { StockData } from '../types';

interface AnalysisCardProps {
  data: StockData;
  comparisonData?: StockData | null;
}

const RsiChart: React.FC<{ history: number[] }> = ({ history }) => {
  if (!history || history.length < 2) return null;

  const width = 100;
  const height = 40;
  const maxVal = 100;
  
  // Map history to points string
  const points = history.map((val, i) => {
    const x = (i / (history.length - 1)) * width;
    const y = height - (val / maxVal) * height;
    return `${x},${y}`;
  }).join(' ');

  // Create fill area path (down to bottom)
  const fillPath = `${points} ${width},${height} 0,${height}`;
  
  // Last point coordinates for the dot
  const lastVal = history[history.length - 1];
  const lastX = width;
  const lastY = height - (lastVal / maxVal) * height;

  return (
    <div className="w-full h-24 mt-4 relative">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="rsiGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#60a5fa" stopOpacity="0" />
          </linearGradient>
        </defs>
        
        {/* Overbought Zone (>70) */}
        <rect x="0" y="0" width={width} height={height * 0.3} fill="rgba(244, 63, 94, 0.1)" />
        <line x1="0" y1={height * 0.3} x2={width} y2={height * 0.3} stroke="#fda4af" strokeWidth="0.5" strokeDasharray="2 2" />
        
        {/* Oversold Zone (<30) */}
        <rect x="0" y={height * 0.7} width={width} height={height * 0.3} fill="rgba(52, 211, 153, 0.1)" />
        <line x1="0" y1={height * 0.7} x2={width} y2={height * 0.7} stroke="#6ee7b7" strokeWidth="0.5" strokeDasharray="2 2" />

        {/* Trend Line */}
        <path d={`M ${fillPath}`} fill="url(#rsiGradient)" />
        <polyline points={points} fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        
        {/* Current Value Dot */}
        <circle cx={lastX} cy={lastY} r="2" fill="#fff" stroke="#3b82f6" strokeWidth="0.5" vectorEffect="non-scaling-stroke" />
      </svg>
      
      {/* Labels */}
      <div className="absolute right-0 top-0 text-[10px] text-rose-400 font-medium">70</div>
      <div className="absolute right-0 bottom-0 text-[10px] text-emerald-400 font-medium">30</div>
    </div>
  );
};

interface PriceChartProps {
  history: { date: string; price: number }[];
  comparisonHistory?: { date: string; price: number }[];
  currency: string;
  mainTicker: string;
  comparisonTicker?: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ history, comparisonHistory, currency, mainTicker, comparisonTicker }) => {
  // Consolidate Data for Rendering
  // If comparison exists, we switch to Normalized (%) mode
  // We need to align data by date.

  const preparedData = useMemo(() => {
    if (!comparisonHistory) {
      // Single mode
      return history.map(h => ({ date: h.date, priceA: h.price, priceB: null }));
    }

    // Comparison mode: Match dates
    // Create a map of all unique dates
    const dateMap = new Map<string, { priceA: number | null, priceB: number | null }>();
    
    history.forEach(h => {
      dateMap.set(h.date, { priceA: h.price, priceB: null });
    });
    
    comparisonHistory.forEach(h => {
      if (dateMap.has(h.date)) {
        const entry = dateMap.get(h.date)!;
        entry.priceB = h.price;
      } else {
        dateMap.set(h.date, { priceA: null, priceB: h.price });
      }
    });

    // Sort by date
    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    // Filter to range where we have at least one overlapping start point or just show all?
    // Let's show all and handle nulls
    return sortedDates.map(d => ({
      date: d,
      ...dateMap.get(d)!
    }));

  }, [history, comparisonHistory]);

  // Calculate SMAs (only for main ticker in single mode)
  const calculateSMA = (data: any[], period: number, key: string = 'priceA') => {
    if (comparisonHistory) return []; // Disable SMA in comparison mode
    const sma = [];
    for (let i = 0; i < data.length; i++) {
      if (i < period - 1) {
        sma.push(null);
        continue;
      }
      let sum = 0;
      for (let j = 0; j < period; j++) {
        sum += data[i - j][key];
      }
      sma.push(sum / period);
    }
    return sma;
  };

  const sma5 = useMemo(() => calculateSMA(preparedData, 5), [preparedData]);
  const sma20 = useMemo(() => calculateSMA(preparedData, 20), [preparedData]);
  const sma60 = useMemo(() => calculateSMA(preparedData, 60), [preparedData]);
  const sma120 = useMemo(() => calculateSMA(preparedData, 120), [preparedData]);

  const [viewRange, setViewRange] = useState<{start: number, end: number}>({ start: 0, end: Math.max(0, preparedData.length - 1) });
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastClientX = useRef<number>(0);

  useEffect(() => {
    setViewRange({ start: 0, end: Math.max(0, preparedData.length - 1) });
  }, [preparedData.length]);

  const visibleData = useMemo(() => {
    if (!preparedData || preparedData.length === 0) return [];
    const s = Math.max(0, Math.min(viewRange.start, preparedData.length - 1));
    const e = Math.min(preparedData.length - 1, Math.max(viewRange.end, s));
    return preparedData.slice(s, e + 1);
  }, [preparedData, viewRange]);

  const isComparisonMode = !!comparisonHistory;

  // Calculate Axis Domains
  const { minVal, maxVal } = useMemo(() => {
    if (visibleData.length === 0) return { minVal: 0, maxVal: 100 };

    let min = Infinity;
    let max = -Infinity;

    visibleData.forEach(d => {
      if (isComparisonMode) {
        // Calculate % change relative to START of VISIBLE range (or first valid point in visible range)
        // We need base values
        // Actually, better to calculate normalized values on the fly for rendering
      } else {
        if (d.priceA !== null) {
          min = Math.min(min, d.priceA);
          max = Math.max(max, d.priceA);
        }
      }
    });

    if (!isComparisonMode) {
       // Consider SMAs
       const offset = viewRange.start;
       const visibleLen = visibleData.length;
       // We need to slice SMAs to match visibleData
       [sma5, sma20, sma60, sma120].forEach(sma => {
         const visibleSma = sma.slice(offset, offset + visibleLen);
         visibleSma.forEach(v => {
           if (v !== null) {
             min = Math.min(min, v);
             max = Math.max(max, v);
           }
         });
       });
    } else {
      // Comparison Mode Min/Max Logic
      // We normalize based on the first VALID price of each series in the current view
      // Find first valid index for A and B in visibleData
      let baseA = visibleData.find(d => d.priceA !== null)?.priceA;
      let baseB = visibleData.find(d => d.priceB !== null)?.priceB;

      visibleData.forEach(d => {
        if (d.priceA !== null && baseA) {
          const normA = ((d.priceA - baseA) / baseA) * 100;
          min = Math.min(min, normA);
          max = Math.max(max, normA);
        }
        if (d.priceB !== null && baseB) {
          const normB = ((d.priceB - baseB) / baseB) * 100;
          min = Math.min(min, normB);
          max = Math.max(max, normB);
        }
      });
      
      // If still infinity
      if (min === Infinity) min = 0;
      if (max === -Infinity) max = 0;
    }

    const padding = (max - min) * 0.1;
    if (min === max) return { minVal: min - 10, maxVal: max + 10 };
    return { minVal: min - padding, maxVal: max + padding };
  }, [visibleData, isComparisonMode, sma5, sma20, sma60, sma120, viewRange.start]);

  if (!preparedData || preparedData.length < 2) return null;

  const width = 1000;
  const height = 300;

  const getX = (index: number) => (index / (visibleData.length - 1)) * width;
  
  const getY = (val: number) => {
    const range = maxVal - minVal;
    if (range === 0) return height / 2;
    return height - ((val - minVal) / range) * height;
  };

  // Helper to generate path for a series
  const generateLinePath = (key: 'priceA' | 'priceB', isNormalized = false) => {
    // Find base value for normalization
    const base = visibleData.find(d => d[key] !== null)?.[key];
    if (isNormalized && !base) return '';

    return visibleData.map((d, i) => {
      if (d[key] === null) return null; // Gap in data
      const val = isNormalized ? ((d[key]! - base!) / base!) * 100 : d[key]!;
      return `${getX(i)},${getY(val)}`;
    }).filter(p => p !== null).join(' ');
  };

  const generateSmaPath = (smaFull: (number | null)[]) => {
    // Slice pertinent data
    const relevantSma = smaFull.slice(viewRange.start, viewRange.end + 1);
    return relevantSma.map((val, i) => {
      if (val === null) return null;
      return `${getX(i)},${getY(val)}`;
    }).filter(p => p !== null).join(' ');
  };

  const pathA = generateLinePath('priceA', isComparisonMode);
  const pathB = isComparisonMode ? generateLinePath('priceB', true) : '';

  // Base values for tooltip
  const tooltipBaseA = isComparisonMode ? visibleData.find(d => d.priceA !== null)?.priceA : null;
  const tooltipBaseB = isComparisonMode ? visibleData.find(d => d.priceB !== null)?.priceB : null;

  // Interaction Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const total = preparedData.length;
    const currentLen = viewRange.end - viewRange.start;
    const zoomSpeed = Math.max(1, Math.ceil(currentLen * 0.1));
    let newStart = viewRange.start;
    let newEnd = viewRange.end;

    if (e.deltaY < 0) { // Zoom In
      if (currentLen <= 4) return;
      newStart += zoomSpeed;
      newEnd -= zoomSpeed;
    } else { // Zoom Out
      newStart -= zoomSpeed;
      newEnd += zoomSpeed;
    }

    if (newStart < 0) newStart = 0;
    if (newEnd >= total) newEnd = total - 1;
    if (newEnd - newStart < 2) {
       const mid = Math.floor((newStart + newEnd) / 2);
       newStart = Math.max(0, mid - 2);
       newEnd = Math.min(total - 1, mid + 2);
    }
    setViewRange({ start: Math.floor(newStart), end: Math.ceil(newEnd) });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    lastClientX.current = e.clientX;
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (visibleData.length > 0) {
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const index = Math.round(ratio * (visibleData.length - 1));
      setHoverIndex(index);
    }
    if (isDragging) {
      const dx = e.clientX - lastClientX.current;
      lastClientX.current = e.clientX;
      const currentLen = viewRange.end - viewRange.start;
      const pxPerPoint = rect.width / (currentLen || 1);
      const movePoints = -dx / pxPerPoint;
      if (Math.abs(movePoints) > 0.2) {
        const shift = Math.sign(movePoints) * Math.max(1, Math.round(Math.abs(movePoints)));
        let s = viewRange.start + shift;
        let e = viewRange.end + shift;
        if (s < 0) { const diff = -s; s += diff; e += diff; }
        if (e >= preparedData.length) { const diff = e - (preparedData.length - 1); s -= diff; e -= diff; }
        if (s >= 0 && e < preparedData.length) setViewRange({ start: s, end: e });
      }
    }
  };

  return (
    <div 
      ref={containerRef}
      className={`w-full h-80 relative select-none ${isDragging ? 'cursor-grabbing' : 'cursor-crosshair'}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => { setIsDragging(false); setHoverIndex(null); }}
    >
       {/* Reset Button */}
      {(viewRange.start > 0 || viewRange.end < preparedData.length - 1) && (
          <button 
            onClick={(e) => { e.stopPropagation(); setViewRange({ start: 0, end: preparedData.length - 1 }); }}
            className="absolute top-2 right-2 z-20 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs px-2 py-1 rounded border border-slate-700 flex items-center gap-1 backdrop-blur transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Reset Zoom
          </button>
      )}

      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full overflow-visible" preserveAspectRatio="none">
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Grid Lines */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <line key={t} x1="0" y1={height * t} x2={width} y2={height * t} stroke="#334155" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
        ))}

        {/* Zero Line for Comparison */}
        {isComparisonMode && minVal < 0 && maxVal > 0 && (
          <line x1="0" y1={getY(0)} x2={width} y2={getY(0)} stroke="#94a3b8" strokeWidth="1" opacity="0.5" />
        )}

        {/* Main Line */}
        {pathA && (
          <>
            {!isComparisonMode && <path d={`M ${pathA} ${width},${height} 0,${height}`} fill="url(#priceGradient)" />}
            <polyline points={pathA} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </>
        )}

        {/* Comparison Line */}
        {pathB && (
            <polyline points={pathB} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}

        {/* SMAs (Only in Single Mode) */}
        {!isComparisonMode && (
          <>
            <polyline points={generateSmaPath(sma120)} fill="none" stroke="#64748b" strokeWidth="1" strokeDasharray="5 5" opacity="0.6" vectorEffect="non-scaling-stroke" />
            <polyline points={generateSmaPath(sma60)} fill="none" stroke="#f59e0b" strokeWidth="1" opacity="0.7" vectorEffect="non-scaling-stroke" />
            <polyline points={generateSmaPath(sma20)} fill="none" stroke="#f43f5e" strokeWidth="1" opacity="0.8" vectorEffect="non-scaling-stroke" />
            <polyline points={generateSmaPath(sma5)} fill="none" stroke="#22d3ee" strokeWidth="1" opacity="0.8" vectorEffect="non-scaling-stroke" />
          </>
        )}

        {/* Hover Marker */}
        {hoverIndex !== null && visibleData[hoverIndex] && (
          <line x1={getX(hoverIndex)} y1={0} x2={getX(hoverIndex)} y2={height} stroke="#cbd5e1" strokeWidth="1" strokeDasharray="4 4" opacity="0.5" vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {/* Legend */}
      <div className="absolute top-2 left-2 flex gap-3 text-[10px] font-mono pointer-events-none">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-violet-500"></div>
          <span className="text-violet-200">{mainTicker}</span>
        </div>
        {isComparisonMode ? (
           <div className="flex items-center gap-1">
            <div className="w-3 h-0.5 bg-emerald-500"></div>
            <span className="text-emerald-200">{comparisonTicker}</span>
          </div>
        ) : (
          <>
            <span className="text-cyan-400">MA5</span>
            <span className="text-rose-400">MA20</span>
            <span className="text-amber-400">MA60</span>
            <span className="text-slate-400">MA120</span>
          </>
        )}
      </div>

      {/* X-Axis */}
      <div className="flex justify-between text-[10px] text-slate-500 mt-2 px-1 pointer-events-none">
        {visibleData.filter((_, i, arr) => i === 0 || i === arr.length - 1 || i === Math.floor(arr.length/2)).map((h, i) => (
          <span key={i}>{h.date}</span>
        ))}
      </div>

      {/* Tooltip */}
      {hoverIndex !== null && visibleData[hoverIndex] && (
        <div 
           className="absolute z-30 bg-slate-900/95 border border-slate-700 p-3 rounded-lg shadow-xl backdrop-blur-md pointer-events-none transform -translate-x-1/2 -translate-y-full"
           style={{
             left: `${(hoverIndex / (visibleData.length - 1)) * 100}%`,
             top: '10%', 
           }}
        >
          <div className="text-xs text-slate-400 mb-2 border-b border-slate-700 pb-1">{visibleData[hoverIndex].date}</div>
          
          {/* Ticker A */}
          <div className="flex justify-between gap-4 text-sm items-center">
             <span className="text-violet-400 font-bold">{mainTicker}</span>
             <div className="text-right">
                <div className="text-white font-mono">
                  {visibleData[hoverIndex].priceA ? visibleData[hoverIndex].priceA?.toLocaleString() : '-'}
                </div>
                {isComparisonMode && visibleData[hoverIndex].priceA && tooltipBaseA && (
                  <div className={`text-[10px] ${((visibleData[hoverIndex].priceA! - tooltipBaseA) / tooltipBaseA) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {(((visibleData[hoverIndex].priceA! - tooltipBaseA) / tooltipBaseA) * 100).toFixed(2)}%
                  </div>
                )}
             </div>
          </div>

          {/* Ticker B */}
          {isComparisonMode && (
            <div className="flex justify-between gap-4 text-sm items-center mt-2 pt-2 border-t border-slate-800">
              <span className="text-emerald-400 font-bold">{comparisonTicker}</span>
              <div className="text-right">
                 <div className="text-white font-mono">
                   {visibleData[hoverIndex].priceB ? visibleData[hoverIndex].priceB?.toLocaleString() : '-'}
                 </div>
                 {visibleData[hoverIndex].priceB && tooltipBaseB && (
                   <div className={`text-[10px] ${((visibleData[hoverIndex].priceB! - tooltipBaseB) / tooltipBaseB) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                     {(((visibleData[hoverIndex].priceB! - tooltipBaseB) / tooltipBaseB) * 100).toFixed(2)}%
                   </div>
                 )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const AnalysisCard: React.FC<AnalysisCardProps> = ({ data, comparisonData }) => {
  const drawdown = ((data.highPrice - data.currentPrice) / data.highPrice) * 100;
  const isRsiHigh = data.rsi !== null && data.rsi > 70;
  const isRsiLow = data.rsi !== null && data.rsi < 30;

  let signal = "중립 (Hold)";
  let signalColor = "text-slate-400";
  
  if (isRsiHigh) {
    signal = "매도 고려";
    signalColor = "text-rose-400";
  } else if (isRsiLow) {
    signal = "매수 기회";
    signalColor = "text-emerald-400";
  }

  // Comparison Calculation
  const compDrawdown = comparisonData ? ((comparisonData.highPrice - comparisonData.currentPrice) / comparisonData.highPrice) * 100 : 0;

  return (
    <div className="w-full mb-8 space-y-4">
      
      {/* Head-to-Head Comparison Section */}
      {comparisonData && (
        <div className="bg-slate-800/80 border border-slate-600 rounded-xl p-0 overflow-hidden mb-6">
          <div className="bg-slate-900/50 px-6 py-3 border-b border-slate-700 flex justify-between items-center">
            <h3 className="text-white font-bold flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-400" />
              Head-to-Head Analysis
            </h3>
          </div>
          <div className="grid grid-cols-3 divide-x divide-slate-700">
             {/* Ticker A Column */}
             <div className="p-4 text-center">
                <div className="text-xl font-bold text-violet-400 mb-1">{data.ticker}</div>
                <div className="text-xs text-slate-500">{data.currentPrice.toLocaleString()} {data.currency}</div>
             </div>
             
             {/* Metrics Column */}
             <div className="p-4 space-y-4">
                <div className="flex items-center justify-between text-xs text-slate-400 px-2">
                   <span>{data.ticker}</span>
                   <span className="font-bold text-slate-200">METRIC</span>
                   <span>{comparisonData.ticker}</span>
                </div>
                
                {/* RSI Comparison */}
                <div className="relative h-6 bg-slate-900 rounded-full overflow-hidden flex items-center">
                   <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-700"></div>
                   {/* A Marker */}
                   {data.rsi && (
                     <div 
                        className={`absolute h-4 w-1 rounded-full top-1 transition-all ${data.rsi > 70 ? 'bg-rose-500' : data.rsi < 30 ? 'bg-emerald-500' : 'bg-violet-500'}`}
                        style={{ left: `${data.rsi}%` }}
                     />
                   )}
                   {/* B Marker */}
                   {comparisonData.rsi && (
                     <div 
                        className={`absolute h-4 w-1 rounded-full top-1 transition-all ${comparisonData.rsi > 70 ? 'bg-rose-500' : comparisonData.rsi < 30 ? 'bg-emerald-500' : 'bg-emerald-400'}`}
                        style={{ left: `${comparisonData.rsi}%` }}
                     />
                   )}
                   <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white/50">RSI</span>
                </div>
                <div className="flex justify-between text-xs font-mono">
                   <span className={data.rsi && data.rsi > 70 ? 'text-rose-400' : data.rsi && data.rsi < 30 ? 'text-emerald-400' : 'text-slate-400'}>{data.rsi}</span>
                   <span className={comparisonData.rsi && comparisonData.rsi > 70 ? 'text-rose-400' : comparisonData.rsi && comparisonData.rsi < 30 ? 'text-emerald-400' : 'text-slate-400'}>{comparisonData.rsi}</span>
                </div>

                {/* Drawdown Comparison */}
                <div className="text-center">
                   <div className="text-[10px] text-slate-500 mb-1">Drawdown (From High)</div>
                   <div className="flex justify-between items-center bg-slate-900 rounded-lg p-1.5">
                      <span className="text-rose-400 font-bold">-{drawdown.toFixed(1)}%</span>
                      <div className="h-3 w-px bg-slate-700 mx-2"></div>
                      <span className="text-rose-400 font-bold">-{compDrawdown.toFixed(1)}%</span>
                   </div>
                </div>
             </div>

             {/* Ticker B Column */}
             <div className="p-4 text-center">
                <div className="text-xl font-bold text-emerald-400 mb-1">{comparisonData.ticker}</div>
                <div className="text-xs text-slate-500">{comparisonData.currentPrice.toLocaleString()} {comparisonData.currency}</div>
             </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Drawdown Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">전고점 대비 하락</span>
              <TrendingDown className="w-5 h-5 text-rose-500" />
            </div>
            <div className="flex items-end gap-2">
              <span className="text-3xl font-bold text-white">
                -{drawdown.toFixed(2)}%
              </span>
            </div>
            <div className="mt-2 text-xs text-slate-500">
               기준: {data.highType} ({data.currency} {data.highPrice.toLocaleString()})
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-700/50">
            <div className="flex justify-between text-sm">
               <span className="text-slate-400">현재가</span>
               <span className="text-white font-medium">{data.currency} {data.currentPrice.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* RSI Card */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm relative overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-1">
            <span className="text-slate-400 text-sm font-medium">RSI (14) Trend</span>
            <Activity className={`w-5 h-5 ${isRsiHigh ? 'text-rose-500' : isRsiLow ? 'text-emerald-500' : 'text-blue-400'}`} />
          </div>
          
          <div className="flex items-baseline justify-between">
              <div className="flex items-end gap-2">
                <span className={`text-3xl font-bold ${isRsiHigh ? 'text-rose-400' : isRsiLow ? 'text-emerald-400' : 'text-white'}`}>
                  {data.rsi !== null ? data.rsi : 'N/A'}
                </span>
              </div>
              <span className={`text-xs font-bold px-2 py-1 rounded bg-slate-900/50 border border-slate-700 ${signalColor}`}>
                 {signal}
              </span>
          </div>

          <div className="flex-grow flex items-end">
             {data.rsiHistory && data.rsiHistory.length > 0 ? (
               <RsiChart history={data.rsiHistory} />
             ) : (
               data.rsi !== null && (
                <div className="w-full h-1.5 bg-slate-700 mt-4 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ${isRsiHigh ? 'bg-rose-500' : isRsiLow ? 'bg-emerald-500' : 'bg-blue-500'}`}
                    style={{ width: `${data.rsi}%` }}
                  />
                </div>
               )
             )}
          </div>
        </div>

        {/* Market Status Summary */}
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 text-sm font-medium">AI 진단</span>
              {drawdown > 20 ? (
                <AlertCircle className="w-5 h-5 text-emerald-500" />
              ) : (
                <TrendingUp className="w-5 h-5 text-slate-400" />
              )}
            </div>
            
            <div className="space-y-4 mt-2">
               <div>
                 <h4 className="text-slate-300 font-medium text-sm">추세 강도</h4>
                 <p className="text-lg font-semibold text-slate-100">
                    {drawdown > 20 ? "Bearish (약세)" : drawdown > 10 ? "Correction (조정)" : "Bullish (강세)"}
                 </p>
               </div>
               
               <div>
                 <h4 className="text-slate-300 font-medium text-sm">투자 포인트</h4>
                 <p className="text-xs text-slate-400 leading-relaxed mt-1">
                   {isRsiLow 
                     ? "RSI가 과매도 구간에 진입했습니다. 기술적 반등 가능성이 높으므로 분할 매수를 고려할 수 있는 시점입니다." 
                     : isRsiHigh 
                       ? "RSI가 과매수 구간입니다. 단기 과열 상태로, 차익 실현 매물이 나올 수 있으니 주의가 필요합니다."
                       : drawdown > 15 
                         ? "고점 대비 낙폭이 큽니다. 저점 매수 기회를 엿볼 수 있으나, 추가 하락 리스크를 관리하세요."
                         : "뚜렷한 과매수/과매도 신호가 없습니다. 추세를 따라가는 전략이 유효합니다."}
                 </p>
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Price History Chart Section */}
      {data.priceHistory && data.priceHistory.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 backdrop-blur-sm">
           <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <TrendingIcon className="w-5 h-5 text-purple-400" />
                <span className="text-slate-200 font-medium">
                  {comparisonData ? "Price Performance Comparison (%)" : "1 Year Price History"}
                </span>
              </div>
              <div className="flex items-center gap-4">
                  <span className="text-xs text-slate-500">
                    Scroll to Zoom • Drag to Pan
                  </span>
              </div>
           </div>
           <PriceChart 
              history={data.priceHistory} 
              comparisonHistory={comparisonData?.priceHistory}
              currency={data.currency} 
              mainTicker={data.ticker}
              comparisonTicker={comparisonData?.ticker}
           />
        </div>
      )}
    </div>
  );
};

export default AnalysisCard;
import React from 'react';
import { ArrowDown, DollarSign } from './Icons';
import { StockData, DipScenario } from '../types';

interface DipCalculatorProps {
  data: StockData;
}

const DipCalculator: React.FC<DipCalculatorProps> = ({ data }) => {
  const scenarios: number[] = [5, 10, 15, 20, 30, 50];

  const calculateDip = (percent: number): DipScenario => {
    const price = data.currentPrice * (1 - percent / 100);
    let note = '';
    if (percent === 10) note = '일반적인 조정';
    if (percent === 20) note = '약세장 진입';
    if (percent === 50) note = '반토막 (패닉)';
    
    return { percentage: percent, price, note };
  };

  return (
    <div className="w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl transition-colors">
      <div className="p-6 border-b border-slate-800 bg-slate-900/50 flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
           <ArrowDown className="w-5 h-5 text-primary" />
        </div>
        <h3 className="text-lg font-semibold text-white">저점 매수 시나리오 (Dip Calculator)</h3>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-800/30 text-slate-400 text-sm border-b border-slate-700">
              <th className="p-4 font-medium">하락율 (현재가 기준)</th>
              <th className="p-4 font-medium">예상 주가</th>
              <th className="p-4 font-medium hidden sm:table-cell">비고</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800 text-sm">
            {scenarios.map((pct) => {
              const scenario = calculateDip(pct);
              return (
                <tr key={pct} className="hover:bg-slate-800/40 transition-colors">
                  <td className="p-4 text-rose-400 font-semibold">
                    -{pct}%
                  </td>
                  <td className="p-4 text-white font-mono text-base">
                    {data.currency} {scenario.price.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="p-4 text-slate-500 hidden sm:table-cell">
                    {scenario.note || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="p-4 bg-slate-900/80 border-t border-slate-800 text-xs text-slate-500 text-center">
         ※ 위 계산은 단순 수치 계산이며 투자 권유가 아닙니다.
      </div>
    </div>
  );
};

export default DipCalculator;
import React, { useState } from 'react';
import { BotLogEntry } from '../types/trading';
import { Terminal, Trash2, Filter } from 'lucide-react';

interface ExecutionConsoleProps {
  logs: BotLogEntry[];
  onClearLogs: () => void;
}

export const ExecutionConsole: React.FC<ExecutionConsoleProps> = ({ logs, onClearLogs }) => {
  const [filterLevel, setFilterLevel] = useState<'ALL' | 'SIGNAL' | 'ORDER' | 'RISK'>('ALL');

  const filteredLogs = logs.filter((l) => {
    if (filterLevel === 'ALL') return true;
    return l.level === filterLevel;
  });

  return (
    <div className="flex flex-col h-full bg-[#0d121c] border border-slate-800/80 rounded-xl overflow-hidden font-mono select-none">
      {/* Console Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-[#0f1624]">
        <div className="flex items-center gap-2">
          <Terminal className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
            Algorithmic Engine Audit Console
          </span>
          <span className="text-[10px] text-slate-500">({logs.length} events)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Level Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-md p-0.5 text-[10px]">
            {(['ALL', 'SIGNAL', 'ORDER', 'RISK'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setFilterLevel(lvl)}
                className={`px-2 py-0.5 rounded transition-colors ${
                  filterLevel === lvl
                    ? 'bg-slate-800 text-slate-100 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {lvl}
              </button>
            ))}
          </div>

          <button
            onClick={onClearLogs}
            title="Clear Logs"
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Logs Stream */}
      <div className="flex-1 p-3 overflow-y-auto space-y-1.5 text-xs">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-slate-500 text-xs">
            Console stream idle. Deploy trading bot or execute orders to view real-time telemetry.
          </div>
        ) : (
          filteredLogs
            .slice()
            .reverse()
            .map((entry) => {
              const timeStr = new Date(entry.timestamp).toLocaleTimeString();
              const levelColors = {
                INFO: 'text-slate-400 border-slate-800',
                SIGNAL: 'text-cyan-400 border-cyan-800/50',
                ORDER: 'text-emerald-400 border-emerald-800/50',
                RISK: 'text-amber-400 border-amber-800/50',
                WARNING: 'text-rose-400 border-rose-800/50',
              };

              return (
                <div
                  key={entry.id}
                  className="flex items-start gap-2.5 p-1.5 rounded hover:bg-slate-900/60 transition-colors"
                >
                  <span className="text-slate-500 text-[11px] tabular-nums shrink-0">
                    [{timeStr}]
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded border uppercase shrink-0 ${
                      levelColors[entry.level]
                    }`}
                  >
                    {entry.level}
                  </span>
                  <span className="text-slate-300 leading-tight break-all">
                    {entry.message}
                  </span>
                </div>
              );
            })
        )}
      </div>
    </div>
  );
};

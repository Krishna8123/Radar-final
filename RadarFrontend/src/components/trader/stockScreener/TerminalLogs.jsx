import { useEffect, useState, useRef, memo } from "react";
import { Terminal, Cpu, Zap, BellRing, Target } from "lucide-react";

const INITIAL_LOGS = [
  { id: 1, time: new Date().toLocaleTimeString("en-GB", { hour12: false }), symbol: "SYSTEM", message: "Market Terminal 4.2.0 Online. Secure connection established.", type: "neutral" },
];

function TerminalLogs({ mode = "standard", scanTimestamp }) {
  const [logs, setLogs] = useState(INITIAL_LOGS);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scanTimestamp) {
        const now = new Date();
        const time = now.toLocaleTimeString("en-GB", { hour12: false });
        const newLog = {
            id: `system-${Date.now()}`,
            time,
            symbol: "SCANNER",
          message: "⚡ TRADER SCAN INITIATED: Synchronizing asset sector parameters...",
            type: "neutral"
        };
        setLogs(prev => [...prev, newLog].slice(-50));
    }
  }, [scanTimestamp]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (mode === "actionable") {
    return (
      <div className="terminal-logs-content custom-scrollbar" ref={scrollRef}>
        {logs.map((log) => (
          <div key={log.id} className="log-entry flex items-center justify-between border-b border-white/[0.02] py-2">
            <div className="flex items-center gap-4">
               <span className="log-time font-mono text-[9px] text-[#475569]">{log.time}</span>
               <span className="log-symbol font-black text-blue-400 text-[10px] w-16">{log.symbol}</span>
               <span className={`log-msg text-[11px] font-bold ${log.type === 'positive' ? 'text-emerald-400' : log.type === 'negative' ? 'text-rose-400' : 'text-slate-400'}`}>
                 {log.message}
               </span>
            </div>
            {log.prob && (
              <div className="flex items-center gap-2">
                 <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Conviction</span>
                  <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-400 text-[9px] font-black">
                    {log.prob}
                  </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="terminal-logs-container">
      <div className="terminal-logs-header">
        <Terminal size={14} className="text-blue-500" />
        <span className="text-[10px] font-bold text-white uppercase tracking-widest">Trading Terminal Feed</span>
      </div>
      <div className="terminal-logs-content custom-scrollbar" ref={scrollRef}>
        {logs.map((log) => (
          <div key={log.id} className="log-entry">
            <span className="log-time">{log.time}</span>
            <span className="log-symbol">{log.symbol}</span>
            <span className={`log-msg ${log.type === "positive" ? "positive" : log.type === "negative" ? "negative" : ""}`}>
              {log.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(TerminalLogs);

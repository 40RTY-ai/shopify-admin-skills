import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './RoutineFeed.css';

type Node = {
  id: string;
  label: string;
  schedule: string;
  side: 'left' | 'right';
  row: 0 | 1 | 2;
  color: string;
  icon: 'sun' | 'box' | 'shield' | 'truck' | 'chart' | 'heart';
};

const nodes: Node[] = [
  { id: 'morning-briefing', label: 'Morning Briefing', schedule: 'Daily 8 AM', side: 'left', row: 0, color: '#5B8DEF', icon: 'sun' },
  { id: 'low-stock-watchdog', label: 'Low Stock Watchdog', schedule: 'Daily 7 AM', side: 'left', row: 1, color: '#E87838', icon: 'box' },
  { id: 'fraud-sentinel', label: 'Fraud Sentinel', schedule: 'Every 2h', side: 'left', row: 2, color: '#E85D75', icon: 'shield' },
  { id: 'fulfillment-sla', label: 'Fulfillment SLA', schedule: 'Wkdys 10/3', side: 'right', row: 0, color: '#3DBB8F', icon: 'truck' },
  { id: 'weekly-review', label: 'Weekly Review', schedule: 'Mon 8 AM', side: 'right', row: 1, color: '#9B6EE3', icon: 'chart' },
  { id: 'churn-watch', label: 'Churn Watch', schedule: 'Wed 8 AM', side: 'right', row: 2, color: '#5BB8A8', icon: 'heart' },
];

const W = 580;
const H = 360;
const CENTER_X = W / 2;
const CENTER_Y = H / 2;
const NODE_W = 168;
const NODE_H = 70;
const ROW_Y = [54, 145, 236];
const SIDE_X = { left: 22, right: W - NODE_W - 22 };

function nodeAnchor(n: Node): { x: number; y: number } {
  const x = n.side === 'left' ? SIDE_X.left + NODE_W : SIDE_X.right;
  const y = ROW_Y[n.row] + NODE_H / 2;
  return { x, y };
}

function pathFor(n: Node): string {
  const { x, y } = nodeAnchor(n);
  const dir = n.side === 'left' ? 1 : -1;
  // smooth curve from node anchor to center
  const cx1 = x + dir * 80;
  const cy1 = y;
  const cx2 = CENTER_X - dir * 60;
  const cy2 = CENTER_Y;
  return `M ${x} ${y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${CENTER_X} ${CENTER_Y}`;
}

function NodeIcon({ kind }: { kind: Node['icon'] }) {
  const stroke = 'currentColor';
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke, strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'sun':
      return (<svg {...props}><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></svg>);
    case 'box':
      return (<svg {...props}><path d="M21 8 12 3 3 8l9 5 9-5z" /><path d="m3 8 9 5v8" /><path d="m21 8-9 5" /></svg>);
    case 'shield':
      return (<svg {...props}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>);
    case 'truck':
      return (<svg {...props}><rect x="1" y="6" width="13" height="11" rx="1" /><path d="M14 9h4l4 4v4h-8V9z" /><circle cx="6" cy="19" r="2" /><circle cx="18" cy="19" r="2" /></svg>);
    case 'chart':
      return (<svg {...props}><path d="M3 3v18h18" /><path d="m7 14 3-3 4 4 5-7" /></svg>);
    case 'heart':
      return (<svg {...props}><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 0 0 0-7.78z" /></svg>);
  }
}

type Beam = {
  id: number;
  nodeId: string;
};

export default function RoutineBeams() {
  const [beams, setBeams] = useState<Beam[]>([]);
  const [counter, setCounter] = useState(0);
  const [activeRoutine, setActiveRoutine] = useState<string | null>(null);
  const [storePulse, setStorePulse] = useState(0);

  // Fire a beam every ~1.6s
  useEffect(() => {
    const interval = setInterval(() => {
      const next = nodes[counter % nodes.length];
      const id = counter;
      setBeams(prev => [...prev, { id, nodeId: next.id }]);
      setActiveRoutine(next.id);
      setCounter(c => c + 1);
      // fire pulse on store node when beam reaches center
      setTimeout(() => setStorePulse(p => p + 1), 1100);
      // remove beam after animation
      setTimeout(() => {
        setBeams(prev => prev.filter(b => b.id !== id));
      }, 1700);
      // clear active highlight
      setTimeout(() => setActiveRoutine(null), 1500);
    }, 1600);
    return () => clearInterval(interval);
  }, [counter]);

  return (
    <div className="rb-shell">
      <div className="rb-header">
        <span className="rb-pulse" />
        <span className="rb-label">Routines · live</span>
        <span className="rb-stat">{nodes.length} active · {Math.floor(Math.random() * 100) + 200} fires today</span>
      </div>

      <div className="rb-canvas">
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" className="rb-svg">
          <defs>
            {nodes.map(n => (
              <linearGradient key={`g-${n.id}`} id={`g-${n.id}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2="0">
                <stop offset="0" stopColor={n.color} stopOpacity="0" />
                <stop offset="0.5" stopColor={n.color} stopOpacity="1" />
                <stop offset="1" stopColor={n.color} stopOpacity="0" />
              </linearGradient>
            ))}
            <radialGradient id="rb-store-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#1f1e1b" stopOpacity="0.04" />
              <stop offset="100%" stopColor="#1f1e1b" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* base paths, subtle */}
          {nodes.map(n => (
            <path
              key={`base-${n.id}`}
              d={pathFor(n)}
              stroke="rgba(31, 30, 27, 0.08)"
              strokeWidth="1.2"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="2 4"
            />
          ))}

          {/* animated beams */}
          {beams.map(beam => {
            const node = nodes.find(n => n.id === beam.nodeId)!;
            return (
              <motion.path
                key={beam.id}
                d={pathFor(node)}
                stroke={node.color}
                strokeWidth="2.2"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: [0, 1, 1], opacity: [0, 1, 0] }}
                transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], times: [0, 0.6, 1] }}
                style={{ filter: `drop-shadow(0 0 6px ${node.color}88)` }}
              />
            );
          })}
        </svg>

        {/* Center store node — fixed position */}
        <motion.div
          key={`store-${storePulse}`}
          className="rb-store"
          initial={{ scale: 1 }}
          animate={{ scale: [1, 1.04, 1], boxShadow: ['0 0 0 0 rgba(218,119,86,0.4)', '0 0 0 16px rgba(218,119,86,0)', '0 0 0 0 rgba(218,119,86,0)'] }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ left: CENTER_X, top: CENTER_Y }}
        >
          <div className="rb-store-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="rb-store-label">my-store</div>
        </motion.div>

        {/* Routine nodes — fixed positions */}
        {nodes.map(node => {
          const x = node.side === 'left' ? SIDE_X.left : SIDE_X.right;
          const y = ROW_Y[node.row];
          const isActive = activeRoutine === node.id;
          return (
            <div
              key={node.id}
              className={`rb-node rb-node-${node.side} ${isActive ? 'is-active' : ''}`}
              style={{
                left: x,
                top: y,
                width: NODE_W,
                height: NODE_H,
                ['--node-color' as string]: node.color,
              }}
            >
              <div className="rb-node-icon" style={{ color: node.color }}>
                <NodeIcon kind={node.icon} />
              </div>
              <div className="rb-node-body">
                <div className="rb-node-name">{node.label}</div>
                <div className="rb-node-meta">{node.schedule}</div>
              </div>
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    className="rb-node-spark"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    style={{ background: node.color }}
                  />
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </div>
  );
}

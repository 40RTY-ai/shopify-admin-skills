import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './UnifiedHero.css';

/* ───────── data ───────── */
type AgentNode = {
  id: string;
  label: string;
  schedule: string;
  /** evenly-spaced angle in degrees (0 = right, 90 = bottom, etc.) */
  angle: number;
  color: string;
  icon: 'claude' | 'sun' | 'box' | 'shield' | 'truck' | 'chart' | 'heart';
  result: string;
};

/* 7 nodes spaced evenly: 360 / 7 ≈ 51.4° apart, starting from top */
const RAW_NODES: Omit<AgentNode, 'angle'>[] = [
  { id: 'fraud',    label: 'Fraud Watch',      schedule: 'Every 2 hours', color: '#E85D75', icon: 'shield', result: '3 high-risk orders flagged' },
  { id: 'morning',  label: 'Morning Briefing', schedule: 'Every morning', color: '#5B8DEF', icon: 'sun',    result: 'Posted to #ops' },
  { id: 'lowstock', label: 'Low Stock Alerts', schedule: 'Every morning', color: '#E87838', icon: 'box',    result: '23 SKUs need reorder' },
  { id: 'churn',    label: 'Churn Watch',      schedule: 'Wednesdays',    color: '#5BB8A8', icon: 'heart',  result: '8 customers at risk' },
  { id: 'claude',   label: 'Claude',           schedule: 'On demand',     color: '#DA7756', icon: 'claude', result: 'Saved restock CSV' },
  { id: 'weekly',   label: 'Weekly Review',    schedule: 'Mondays',       color: '#9B6EE3', icon: 'chart',  result: 'Revenue ↑ 14% WoW' },
  { id: 'shipping', label: 'Shipping Watch',   schedule: 'Twice a day',   color: '#3DBB8F', icon: 'truck',  result: '4 orders past 48h SLA' },
];

const nodes: AgentNode[] = RAW_NODES.map((n, i) => ({
  ...n,
  // start at -90° (top) and walk clockwise
  angle: -90 + (i * 360) / RAW_NODES.length,
}));

/* ───────── geometry ───────── */
const CANVAS_W = 600;
const CANVAS_H = 600;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2;
const RADIUS = 230;

function nodePosition(n: AgentNode): { x: number; y: number } {
  const rad = (n.angle * Math.PI) / 180;
  return {
    x: CENTER_X + Math.cos(rad) * RADIUS,
    y: CENTER_Y + Math.sin(rad) * RADIUS,
  };
}

function nodeAnchor(n: AgentNode): { x: number; y: number } {
  const p = nodePosition(n);
  const dx = CENTER_X - p.x;
  const dy = CENTER_Y - p.y;
  const len = Math.hypot(dx, dy);
  // anchor sits inset from card center toward store
  const r = 36;
  return { x: p.x + (dx / len) * r, y: p.y + (dy / len) * r };
}

function pathFor(n: AgentNode): string {
  const a = nodeAnchor(n);
  // Build a real curve: control point perpendicular to the line, biased outward
  const dx = CENTER_X - a.x;
  const dy = CENTER_Y - a.y;
  const len = Math.hypot(dx, dy);
  const px = -dy / len; // perpendicular unit vector
  const py = dx / len;
  // Curve direction alternates clockwise based on quadrant for visual variety
  const sign = a.x < CENTER_X ? -1 : 1;
  const curvature = 24;
  const mx = (a.x + CENTER_X) / 2 + px * curvature * sign;
  const my = (a.y + CENTER_Y) / 2 + py * curvature * sign;
  return `M ${a.x} ${a.y} Q ${mx} ${my}, ${CENTER_X} ${CENTER_Y}`;
}

/* Single fixed chip position above the store — never collides with nodes */
const CHIP_X = CENTER_X;
const CHIP_Y = CENTER_Y - 130;

/* ───────── icons ───────── */
const ClaudeMark = ({ size = 16, fill = 'currentColor' }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4.5c2 5 4 8 7 9.5-3 1.5-5 4.5-7 9.5-2-5-4-8-7-9.5 3-1.5 5-4.5 7-9.5z"
      fill={fill}
    />
  </svg>
);

const ShopifyBag = ({ size = 46 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 109 124" fill="none">
    <path
      d="M74.7 14.9c-.1-.5-.5-.7-.8-.8-.4-.1-7.6-.1-7.6-.1L60.6 7.9c-.6-.6-1.7-.4-2.1-.3l-3 .9C53.2 4.7 50.4.4 45.6.4c-.1 0-.3 0-.4.1-.1-.2-.3-.4-.4-.5-1.4-1.5-3.2-2.2-5.4-2.2-4.2.1-8.4 3.1-11.8 8.5-2.4 3.8-4.2 8.6-4.7 12.3-4.8 1.5-8.2 2.5-8.3 2.6-2.4.7-2.5.8-2.8 3.1-.2 1.7-6.6 51.5-6.6 51.5l53.6 9.3 23.2-5.8c0-.1-7.3-63.5-7.3-63.9z"
      fill="#95BF47"
    />
    <path
      d="M68.2 14.7l-1.4-7L60.6 1c-.5-.5-1.5-.4-1.5-.4s-1.5 23.4-3.9 47.7L68.2 14.7z"
      fill="#5E8E3E"
    />
    <path
      d="M45.5 25.5l-2.4 7.2s-3.7-1.7-8.2-1.4c-6.6.4-6.7 4.6-6.6 5.6.4 5.7 15.4 6.9 16.2 20.3.7 10.5-5.6 17.7-14.6 18.3-10.9.6-16.9-5.7-16.9-5.7l2.3-9.8s6 4.5 10.8 4.2c3.1-.2 4.3-2.7 4.1-4.5-.5-7.4-12.7-7-13.4-19.3-.6-10.3 6.1-20.7 21-21.6 5.8-.3 8.7 1.7 8.7 1.7z"
      fill="#FFFFFF"
    />
  </svg>
);

function NodeIcon({ kind }: { kind: AgentNode['icon'] }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  switch (kind) {
    case 'claude':
      return <ClaudeMark size={16} fill="currentColor" />;
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

/* ───────── component ───────── */
type ResultChip = {
  id: number;
  nodeId: string;
};

export default function UnifiedHero() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [beams, setBeams] = useState<{ id: number; nodeId: string }[]>([]);
  const [chips, setChips] = useState<ResultChip[]>([]);
  const [storePulse, setStorePulse] = useState(0);
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      const next = nodes[counter % nodes.length];
      const id = counter;
      setBeams(prev => [...prev, { id, nodeId: next.id }]);
      setActiveId(next.id);
      setCounter(c => c + 1);

      // After beam reaches center, pulse store + show result chip
      setTimeout(() => {
        setStorePulse(p => p + 1);
        setChips(prev => [...prev, { id, nodeId: next.id }]);
      }, 950);

      setTimeout(() => setBeams(prev => prev.filter(b => b.id !== id)), 1900);
      setTimeout(() => setActiveId(null), 1700);
      setTimeout(() => setChips(prev => prev.filter(c => c.id !== id)), 2900);
    }, 2200);
    return () => clearInterval(iv);
  }, [counter]);

  return (
    <div className="uh-stage">
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="uh-stage-svg"
      >
        {/* Persistent connection paths — every node always wired to store */}
        {nodes.map(n => (
          <path
            key={`base-${n.id}`}
            d={pathFor(n)}
            stroke={n.color}
            strokeOpacity="0.18"
            strokeWidth="1.2"
            fill="none"
            strokeLinecap="round"
          />
        ))}

        {/* Beams — three layers: wide blurred halo, mid solid, bright moving comet */}
        {beams.map(beam => {
          const node = nodes.find(n => n.id === beam.nodeId)!;
          const a = nodeAnchor(node);
          return (
            <g key={beam.id}>
              {/* Outer halo */}
              <motion.path
                d={pathFor(node)}
                stroke={node.color}
                strokeOpacity="0.45"
                strokeWidth="10"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 0.55, 0.55, 0] }}
                transition={{
                  pathLength: { duration: 1.05, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 1.7, times: [0, 0.4, 0.85, 1] },
                }}
                style={{ filter: 'blur(8px)' }}
              />
              {/* Solid line */}
              <motion.path
                d={pathFor(node)}
                stroke={node.color}
                strokeOpacity="0.95"
                strokeWidth="2.6"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                transition={{
                  pathLength: { duration: 1.05, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 1.7, times: [0, 0.3, 0.82, 1] },
                }}
                style={{ filter: `drop-shadow(0 0 4px ${node.color})` }}
              />
              {/* Bright comet head with triple glow */}
              <motion.circle
                r="5"
                fill="#FFFFFF"
                initial={{ opacity: 0 }}
                animate={{
                  cx: [a.x, CENTER_X],
                  cy: [a.y, CENTER_Y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  cx: { duration: 1.05, ease: [0.4, 0, 0.2, 1] },
                  cy: { duration: 1.05, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 1.2, times: [0, 0.08, 0.85, 1] },
                }}
                style={{
                  filter: `drop-shadow(0 0 4px ${node.color}) drop-shadow(0 0 10px ${node.color}) drop-shadow(0 0 20px ${node.color})`,
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Store at true center */}
      <div
        className="uh-store"
        style={{
          left: `${(CENTER_X / CANVAS_W) * 100}%`,
          top: `${(CENTER_Y / CANVAS_H) * 100}%`,
        }}
      >
        <motion.div
          key={`store-${storePulse}`}
          className="uh-store-icon"
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.06, 1],
            boxShadow: [
              '0 28px 56px -12px rgba(94, 142, 62, 0.4), 0 10px 20px -4px rgba(31, 30, 27, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 0 rgba(94, 142, 62, 0.55)',
              '0 28px 56px -12px rgba(94, 142, 62, 0.4), 0 10px 20px -4px rgba(31, 30, 27, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 22px rgba(94, 142, 62, 0)',
              '0 28px 56px -12px rgba(94, 142, 62, 0.4), 0 10px 20px -4px rgba(31, 30, 27, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.95), 0 0 0 0 rgba(94, 142, 62, 0)',
            ],
          }}
          transition={{ duration: 1, ease: 'easeOut' }}
        >
          <ShopifyBag size={48} />
        </motion.div>
        <div className="uh-store-label">your store</div>
      </div>

      {/* Routine + Claude nodes */}
      {nodes.map(n => {
        const p = nodePosition(n);
        const isActive = activeId === n.id;
        return (
          <div
            key={n.id}
            className={`uh-node ${isActive ? 'is-active' : ''}`}
            style={{
              left: `${(p.x / CANVAS_W) * 100}%`,
              top: `${(p.y / CANVAS_H) * 100}%`,
              ['--node-color' as string]: n.color,
            }}
          >
            <div className="uh-node-icon" style={{ color: n.color }}>
              <NodeIcon kind={n.icon} />
            </div>
            <div className="uh-node-body">
              <div className="uh-node-name">{n.label}</div>
              <div className="uh-node-meta">{n.schedule}</div>
            </div>
            <AnimatePresence>
              {isActive && (
                <motion.span
                  className="uh-node-spark"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.6, opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  style={{ background: n.color }}
                />
              )}
            </AnimatePresence>
          </div>
        );
      })}

      {/* Result chip floats above the store — single anchored slot */}
      <AnimatePresence>
        {chips.map(chip => {
          const node = nodes.find(n => n.id === chip.nodeId)!;
          return (
            <motion.div
              key={chip.id}
              className="uh-result-chip"
              initial={{ opacity: 0, y: 4, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              style={{
                left: `${(CHIP_X / CANVAS_W) * 100}%`,
                top: `${(CHIP_Y / CANVAS_H) * 100}%`,
              }}
            >
              <span className="uh-chip-tick" style={{ background: node.color }}>
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </span>
              <span>{node.result}</span>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

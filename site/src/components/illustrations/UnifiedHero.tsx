import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './UnifiedHero.css';

/* ───────── data ───────── */
type AgentNode = {
  id: string;
  label: string;
  schedule: string;
  position: { angle: number; radius: number }; // polar coords from center, angle in deg
  color: string;
  icon: 'claude' | 'sun' | 'box' | 'shield' | 'truck' | 'chart' | 'heart';
  variant: 'agent' | 'routine';
  example?: string; // short skill the agent runs
};

/* Layout nodes around a center store. Claude at top, routines around the sides + bottom. */
/* 7 nodes evenly distributed around the store. Claude on top, routines spread around. */
const nodes: AgentNode[] = [
  { id: 'claude',   label: 'Claude',           schedule: 'On demand',     position: { angle: -90,  radius: 165 }, color: '#DA7756', icon: 'claude', variant: 'agent', example: 'find low-stock products' },
  { id: 'morning',  label: 'Morning Briefing', schedule: 'Every morning', position: { angle: -140, radius: 200 }, color: '#5B8DEF', icon: 'sun',    variant: 'routine' },
  { id: 'fraud',    label: 'Fraud Watch',      schedule: 'Every 2 hours', position: { angle: -40,  radius: 200 }, color: '#E85D75', icon: 'shield', variant: 'routine' },
  { id: 'lowstock', label: 'Low Stock Alerts', schedule: 'Every morning', position: { angle: 180,  radius: 215 }, color: '#E87838', icon: 'box',    variant: 'routine' },
  { id: 'shipping', label: 'Shipping Watch',   schedule: 'Twice a day',   position: { angle: 0,    radius: 215 }, color: '#3DBB8F', icon: 'truck',  variant: 'routine' },
  { id: 'weekly',   label: 'Weekly Review',    schedule: 'Mondays',       position: { angle: 45,   radius: 200 }, color: '#9B6EE3', icon: 'chart',  variant: 'routine' },
  { id: 'churn',    label: 'Churn Watch',      schedule: 'Wednesdays',    position: { angle: 135,  radius: 200 }, color: '#5BB8A8', icon: 'heart',  variant: 'routine' },
];

/* ───────── geometry ───────── */
const CANVAS_W = 600;
const CANVAS_H = 480;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2 + 20; // store node slightly below center to leave room for Claude on top

function nodePosition(n: AgentNode): { x: number; y: number } {
  const rad = (n.position.angle * Math.PI) / 180;
  return {
    x: CENTER_X + Math.cos(rad) * n.position.radius,
    y: CENTER_Y + Math.sin(rad) * n.position.radius,
  };
}

function nodeAnchor(n: AgentNode): { x: number; y: number } {
  const p = nodePosition(n);
  // Anchor offset toward center (the side of the card facing center)
  const dx = CENTER_X - p.x;
  const dy = CENTER_Y - p.y;
  const len = Math.hypot(dx, dy);
  const ux = dx / len;
  const uy = dy / len;
  // approximate node radius
  const r = 30;
  return { x: p.x + ux * r, y: p.y + uy * r };
}

function pathFor(n: AgentNode): string {
  const a = nodeAnchor(n);
  // gentle quadratic curve toward center via midpoint biased outward
  const mx = (a.x + CENTER_X) / 2;
  const my = (a.y + CENTER_Y) / 2;
  return `M ${a.x} ${a.y} Q ${mx} ${my}, ${CENTER_X} ${CENTER_Y}`;
}

/* ───────── icons ───────── */
const ClaudeMark = ({ size = 22, fill = '#DA7756' }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4.5c2 5 4 8 7 9.5-3 1.5-5 4.5-7 9.5-2-5-4-8-7-9.5 3-1.5 5-4.5 7-9.5z"
      fill={fill}
    />
  </svg>
);

/* Official Shopify shopping-bag mark */
const ShopifyBag = ({ size = 36 }: { size?: number }) => (
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
const claudeExamples = [
  'find low-stock products',
  'audit SEO titles',
  'recover abandoned carts',
  'flag risky orders',
];

export default function UnifiedHero() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [beams, setBeams] = useState<{ id: number; nodeId: string }[]>([]);
  const [storePulse, setStorePulse] = useState(0);
  const [counter, setCounter] = useState(0);
  const [claudeMsgIdx, setClaudeMsgIdx] = useState(0);
  const [claudeTyped, setClaudeTyped] = useState('');

  // Beam fire cycle. Claude fires more often (every other beam).
  useEffect(() => {
    const order = ['claude', 'morning', 'claude', 'lowstock', 'claude', 'fraud', 'claude', 'shipping', 'claude', 'weekly', 'claude', 'churn'];
    const iv = setInterval(() => {
      const nextId = order[counter % order.length];
      const id = counter;
      setBeams(prev => [...prev, { id, nodeId: nextId }]);
      setActiveId(nextId);
      setCounter(c => c + 1);

      // If Claude fires, advance the example bubble
      if (nextId === 'claude') {
        setClaudeMsgIdx(i => (i + 1) % claudeExamples.length);
        setClaudeTyped('');
      }

      setTimeout(() => setStorePulse(p => p + 1), 1100);
      setTimeout(() => setBeams(prev => prev.filter(b => b.id !== id)), 1700);
      setTimeout(() => setActiveId(null), 1500);
    }, 1700);
    return () => clearInterval(iv);
  }, [counter]);

  // Type Claude's example incrementally
  useEffect(() => {
    const target = claudeExamples[claudeMsgIdx];
    if (claudeTyped.length === target.length) return;
    const t = setTimeout(() => {
      setClaudeTyped(target.slice(0, claudeTyped.length + 1));
    }, 36 + Math.random() * 24);
    return () => clearTimeout(t);
  }, [claudeMsgIdx, claudeTyped]);

  return (
    <div className="uh-stage">
      <svg
        width={CANVAS_W}
        height={CANVAS_H}
        viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`}
        preserveAspectRatio="xMidYMid meet"
        className="uh-stage-svg"
      >
        {/* base paths — subtle solid line with continuous flow */}
        {nodes.map(n => (
          <g key={`base-${n.id}`}>
            <path
              d={pathFor(n)}
              stroke="rgba(31, 30, 27, 0.06)"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
            />
            <path
              d={pathFor(n)}
              stroke={n.color}
              strokeOpacity="0.28"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              strokeDasharray="1 6"
            >
              <animate attributeName="stroke-dashoffset" from="0" to="-14" dur="3s" repeatCount="indefinite" />
            </path>
          </g>
        ))}

        {/* Beams: solid base draw + travelling gradient highlight (Magic UI technique) */}
        {beams.map(beam => {
          const node = nodes.find(n => n.id === beam.nodeId)!;
          const a = nodeAnchor(node);
          const dx = CENTER_X - a.x;
          const dy = CENTER_Y - a.y;
          const len = Math.hypot(dx, dy);
          return (
            <g key={beam.id}>
              {/* Soft halo */}
              <motion.path
                d={pathFor(node)}
                stroke={node.color}
                strokeOpacity="0.4"
                strokeWidth="7"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 0.5, 0.5, 0] }}
                transition={{
                  pathLength: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 1.5, times: [0, 0.4, 0.85, 1] },
                }}
                style={{ filter: 'blur(6px)' }}
              />
              {/* Solid base — line draws in */}
              <motion.path
                d={pathFor(node)}
                stroke={node.color}
                strokeOpacity="0.85"
                strokeWidth="1.6"
                fill="none"
                strokeLinecap="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: [0, 1, 1, 0] }}
                transition={{
                  pathLength: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 1.5, times: [0, 0.3, 0.85, 1] },
                }}
              />
              {/* Travelling comet head */}
              <motion.circle
                r="3.5"
                fill={node.color}
                initial={{ opacity: 0 }}
                animate={{
                  cx: [a.x, CENTER_X],
                  cy: [a.y, CENTER_Y],
                  opacity: [0, 1, 1, 0],
                }}
                transition={{
                  cx: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                  cy: { duration: 0.9, ease: [0.4, 0, 0.2, 1] },
                  opacity: { duration: 1.1, times: [0, 0.1, 0.8, 1] },
                }}
                style={{ filter: `drop-shadow(0 0 8px ${node.color}) drop-shadow(0 0 14px ${node.color})` }}
              />
            </g>
          );
        })}
      </svg>

      {/* Center store */}
      <motion.div
        key={`store-${storePulse}`}
        className="uh-store"
        initial={{ scale: 1 }}
        animate={{
          scale: [1, 1.05, 1],
          boxShadow: [
            '0 0 0 0 rgba(94, 142, 62, 0.45)',
            '0 0 0 22px rgba(94, 142, 62, 0)',
            '0 0 0 0 rgba(94, 142, 62, 0)',
          ],
        }}
        transition={{ duration: 0.95, ease: 'easeOut' }}
        style={{
          left: `${(CENTER_X / CANVAS_W) * 100}%`,
          top: `${(CENTER_Y / CANVAS_H) * 100}%`,
        }}
      >
        <div className="uh-store-icon">
          <ShopifyBag size={46} />
        </div>
        <div className="uh-store-label">your store</div>
      </motion.div>

      {/* All nodes */}
      {nodes.map(n => {
        const p = nodePosition(n);
        const isActive = activeId === n.id;
        return (
          <div
            key={n.id}
            className={`uh-node uh-node-${n.variant} ${isActive ? 'is-active' : ''}`}
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
            {n.id === 'claude' && (
              <div className="uh-claude-bubble">
                <span className="uh-bubble-tag">PROMPT</span>
                <span className="uh-claude-bubble-text">
                  {claudeTyped || claudeExamples[claudeMsgIdx]}
                  <span className="uh-caret" />
                </span>
              </div>
            )}
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
    </div>
  );
}

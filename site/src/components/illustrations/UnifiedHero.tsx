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
  icon: 'sun' | 'box' | 'shield' | 'truck' | 'chart' | 'heart';
  result: string;
  href: string;
};

const ROUTINE_BASE = '/routines/';

/* 6 routines spaced evenly around the store. Claude rendered separately as the assistant. */
const RAW_NODES: Omit<AgentNode, 'angle'>[] = [
  { id: 'fraud',    label: 'Fraud Watch',      schedule: 'Every 2 hours', color: '#E85D75', icon: 'shield', result: '3 high-risk orders flagged', href: ROUTINE_BASE + '#fraud-sentinel' },
  { id: 'morning',  label: 'Morning Briefing', schedule: 'Every morning', color: '#5B8DEF', icon: 'sun',    result: 'Posted to #ops',              href: ROUTINE_BASE + '#morning-store-briefing' },
  { id: 'shipping', label: 'Shipping Watch',   schedule: 'Twice a day',   color: '#3DBB8F', icon: 'truck',  result: '4 orders past 48h SLA',        href: ROUTINE_BASE + '#fulfillment-sla-watchdog' },
  { id: 'weekly',   label: 'Weekly Review',    schedule: 'Mondays',       color: '#9B6EE3', icon: 'chart',  result: 'Revenue ↑ 14% WoW',           href: ROUTINE_BASE + '#weekly-business-review' },
  { id: 'churn',    label: 'Churn Watch',      schedule: 'Wednesdays',    color: '#5BB8A8', icon: 'heart',  result: '8 customers at risk',         href: ROUTINE_BASE + '#customer-churn-watch' },
  { id: 'lowstock', label: 'Low Stock Alerts', schedule: 'Every morning', color: '#E87838', icon: 'box',    result: '23 SKUs need reorder',        href: ROUTINE_BASE + '#low-stock-watchdog' },
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

/* Compute the quadratic bezier control point for a node's connection.
   Same math drives pathFor() and the comet-head waypoint sampling so the
   dot stays glued to the visible curve. */
function controlPoint(n: AgentNode): { mx: number; my: number } {
  const a = nodeAnchor(n);
  const dx = CENTER_X - a.x;
  const dy = CENTER_Y - a.y;
  const len = Math.hypot(dx, dy);
  const px = -dy / len; // perpendicular unit vector
  const py = dx / len;
  const sign = a.x < CENTER_X ? -1 : 1;
  const curvature = 24;
  return {
    mx: (a.x + CENTER_X) / 2 + px * curvature * sign,
    my: (a.y + CENTER_Y) / 2 + py * curvature * sign,
  };
}

function pathFor(n: AgentNode): string {
  const a = nodeAnchor(n);
  const { mx, my } = controlPoint(n);
  return `M ${a.x} ${a.y} Q ${mx} ${my}, ${CENTER_X} ${CENTER_Y}`;
}

/* Sample positions along the quadratic bezier. Returns N+1 [cx, cy] pairs
   from t=0 (start anchor) to t=1 (store center) inclusive. */
function bezierWaypoints(n: AgentNode, samples: number = 24): { cx: number[]; cy: number[] } {
  const a = nodeAnchor(n);
  const { mx, my } = controlPoint(n);
  const cx: number[] = [];
  const cy: number[] = [];
  for (let i = 0; i <= samples; i++) {
    const t = i / samples;
    const u = 1 - t;
    cx.push(u * u * a.x + 2 * u * t * mx + t * t * CENTER_X);
    cy.push(u * u * a.y + 2 * u * t * my + t * t * CENTER_Y);
  }
  return { cx, cy };
}

/* Single fixed chip position above the store — never collides with nodes */
const CHIP_X = CENTER_X;
const CHIP_Y = CENTER_Y - 130;

/* ───────── icons ───────── */
/* Official Claude mark — Anthropic brand asset */
const ClaudeMark = ({ size = 16, fill = '#D97757' }: { size?: number; fill?: string }) => (
  <svg width={size} height={size} viewBox="0 0 248 248" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M52.4285 162.873L98.7844 136.879L99.5485 134.602L98.7844 133.334H96.4921L88.7237 132.862L62.2346 132.153L39.3113 131.207L17.0249 130.026L11.4214 128.844L6.2 121.873L6.7094 118.447L11.4214 115.257L18.171 115.847L33.0711 116.911L55.485 118.447L71.6586 119.392L95.728 121.873H99.5485L100.058 120.337L98.7844 119.392L97.7656 118.447L74.5877 102.732L49.4995 86.1905L36.3823 76.62L29.3779 71.7757L25.8121 67.2858L24.2839 57.3608L30.6515 50.2716L39.3113 50.8623L41.4763 51.4531L50.2636 58.1879L68.9842 72.7209L93.4357 90.6804L97.0015 93.6343L98.4374 92.6652L98.6571 91.9801L97.0015 89.2625L83.757 65.2772L69.621 40.8192L63.2534 30.6579L61.5978 24.632C60.9565 22.1032 60.579 20.0111 60.579 17.4246L67.8381 7.49965L71.9133 6.19995L81.7193 7.49965L85.7946 11.0443L91.9074 24.9865L101.714 46.8451L116.996 76.62L121.453 85.4816L123.873 93.6343L124.764 96.1155H126.292V94.6976L127.566 77.9197L129.858 57.3608L132.15 30.8942L132.915 23.4505L136.608 14.4708L143.994 9.62643L149.725 12.344L154.437 19.0788L153.8 23.4505L150.998 41.6463L145.522 70.1215L141.957 89.2625H143.994L146.414 86.7813L156.093 74.0206L172.266 53.698L179.398 45.6635L187.803 36.802L193.152 32.5484H203.34L210.726 43.6549L207.415 55.1159L196.972 68.3492L188.312 79.5739L175.896 96.2095L168.191 109.585L168.882 110.689L170.738 110.53L198.755 104.504L213.91 101.787L231.994 98.7149L240.144 102.496L241.036 106.395L237.852 114.311L218.495 119.037L195.826 123.645L162.07 131.592L161.696 131.893L162.137 132.547L177.36 133.925L183.855 134.279H199.774L229.447 136.524L237.215 141.605L241.8 147.867L241.036 152.711L229.065 158.737L213.019 154.956L175.45 145.977L162.587 142.787H160.805V143.85L171.502 154.366L191.242 172.089L215.82 195.011L217.094 200.682L213.91 205.172L210.599 204.699L188.949 188.394L180.544 181.069L161.696 165.118H160.422V166.772L164.752 173.152L187.803 207.771L188.949 218.405L187.294 221.832L181.308 223.959L174.813 222.777L161.187 203.754L147.305 182.486L136.098 163.345L134.745 164.2L128.075 235.42L125.019 239.082L117.887 241.8L111.902 237.31L108.718 229.984L111.902 215.452L115.722 196.547L118.779 181.541L121.58 162.873L123.291 156.636L123.14 156.219L121.773 156.449L107.699 175.752L86.304 204.699L69.3663 222.777L65.291 224.431L58.2867 220.768L58.9235 214.27L62.8713 208.48L86.304 178.705L100.44 160.155L109.551 149.507L109.462 147.967L108.959 147.924L46.6977 188.512L35.6182 189.93L30.7788 185.44L31.4156 178.115L33.7079 175.752L52.4285 162.873Z"
      fill={fill}
    />
  </svg>
);

/* Official Shopify shopping-bag icon — uses the brand-asset SVG paths */
const ShopifyBag = ({ size = 46 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 109 124" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M74.65 23.73a.83.83 0 0 0-.75-.7c-.31-.02-7.32-.55-7.32-.55s-4.86-4.82-5.39-5.36c-.54-.54-1.59-.37-1.99-.25-.06.02-1.07.33-2.74.85-1.66-4.78-4.59-9.18-9.74-9.18-.14 0-.29.01-.43.02-.05-.06-.1-.12-.16-.18-1.28-1.37-2.91-2.04-4.87-1.99-3.79.11-7.55 2.84-10.61 7.7-2.15 3.41-3.78 7.69-4.24 11.01-4.36 1.35-7.4 2.3-7.79 2.41-2.43.76-2.5.84-2.82 3.13C15.55 32.4 9 87.93 9 87.93l49.42 9.27 26.79-5.79S74.92 24.16 74.65 23.73zm-22.07-5.46c-1.31.4-2.81.87-4.43 1.36v-.95c0-2.91-.4-5.25-1.05-7.1 2.59.32 4.32 3.27 5.48 6.69zm-8.51-6.13c.72 1.81 1.18 4.41 1.18 7.92v.51c-2.86.89-5.97 1.85-9.08 2.81 1.74-6.74 5-9.99 7.9-11.24zm-3.43-3.25c.51 0 1.03.17 1.52.5-3.81 1.79-7.9 6.32-9.62 15.36-2.49.77-4.93 1.53-7.18 2.22 1.93-6.57 6.89-18.08 15.28-18.08z"
      fill="#95BF47"
    />
    <path
      d="M73.9 23.04c-.31-.02-7.32-.55-7.32-.55s-4.86-4.82-5.39-5.36c-.2-.2-.47-.3-.74-.34l-3.74 76.43 26.79-5.79S74.92 24.16 74.65 23.73a.83.83 0 0 0-.75-.69z"
      fill="#5E8E3E"
    />
    <path
      d="M44.93 39.29l-3.31 9.84s-2.91-1.55-6.45-1.55c-5.21 0-5.46 3.27-5.46 4.09 0 4.49 11.7 6.21 11.7 16.71 0 8.26-5.24 13.58-12.31 13.58-8.48 0-12.81-5.27-12.81-5.27l2.27-7.51s4.46 3.83 8.21 3.83c2.45 0 3.45-1.93 3.45-3.34 0-5.86-9.6-6.13-9.6-15.74 0-8.08 5.81-15.91 17.55-15.91 4.51 0 6.76 1.27 6.76 1.27z"
      fill="#FFFFFF"
    />
  </svg>
);

/* Distinctive duotone Phosphor-style icons — fill + stroke layered for depth */
function NodeIcon({ kind }: { kind: AgentNode['icon'] }) {
  const size = 18;
  const baseProps = { width: size, height: size, viewBox: '0 0 24 24', xmlns: 'http://www.w3.org/2000/svg' };
  switch (kind) {
    case 'sun':
      // Sunrise: half sun + horizon — uniquely conveys "morning"
      return (
        <svg {...baseProps}>
          <circle cx="12" cy="13" r="4" fill="currentColor" fillOpacity="0.18" />
          <circle cx="12" cy="13" r="3" fill="currentColor" />
          <path d="M3 18h18M5 21h14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M12 4v3M5.5 6.5l1.8 1.8M18.5 6.5l-1.8 1.8" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      );
    case 'box':
      // Inventory: stacked 3D box with low-fill indicator
      return (
        <svg {...baseProps}>
          <path d="M3 8.5 12 4l9 4.5v7L12 20l-9-4.5z" fill="currentColor" fillOpacity="0.16" />
          <path d="M3 8.5 12 4l9 4.5L12 13z" fill="currentColor" fillOpacity="0.32" />
          <path d="M3 8.5v7L12 20l9-4.5v-7L12 13zM12 13v7M3 8.5 12 13l9-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      );
    case 'shield':
      // Shield with pulse line — fraud/security
      return (
        <svg {...baseProps}>
          <path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6z" fill="currentColor" fillOpacity="0.18" />
          <path d="M12 3 4 6v6c0 4.5 3.4 8.4 8 9 4.6-.6 8-4.5 8-9V6z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
          <path d="M8 12h2l1.5-3 1.5 5 1-2h2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </svg>
      );
    case 'truck':
      // Delivery truck with motion lines
      return (
        <svg {...baseProps}>
          <rect x="2.5" y="7" width="10" height="9" rx="1.2" fill="currentColor" fillOpacity="0.18" />
          <path d="M12.5 10h4l3 3v3h-7z" fill="currentColor" fillOpacity="0.3" />
          <rect x="2.5" y="7" width="10" height="9" rx="1.2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M12.5 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <circle cx="6.5" cy="18" r="1.7" fill="white" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="16.5" cy="18" r="1.7" fill="white" stroke="currentColor" strokeWidth="1.4" />
        </svg>
      );
    case 'chart':
      // Bar chart with rising trendline
      return (
        <svg {...baseProps}>
          <rect x="4" y="13" width="3" height="7" rx="0.6" fill="currentColor" fillOpacity="0.32" />
          <rect x="9" y="9" width="3" height="11" rx="0.6" fill="currentColor" fillOpacity="0.5" />
          <rect x="14" y="6" width="3" height="14" rx="0.6" fill="currentColor" />
          <path d="M3 12 8 9l4 2 7-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="19" cy="5" r="1.5" fill="currentColor" />
        </svg>
      );
    case 'heart':
      // Pulse with dipping heartbeat — at-risk customers
      return (
        <svg {...baseProps}>
          <path d="M3 12h4l2-5 3 10 2-5h7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          <circle cx="20" cy="12" r="1.6" fill="currentColor" />
        </svg>
      );
  }
}

/* ───────── component ───────── */
type ResultChip = {
  id: number;
  nodeId: string;
};

type ClaudeTask = {
  prompt: string;
  skill: string;
  result: string;
};

const claudeTasks: ClaudeTask[] = [
  { prompt: "What's running low?",                 skill: 'Low Stock Watchdog',     result: '23 SKUs need reorder' },
  { prompt: 'Audit my SEO',                        skill: 'SEO Audit',               result: '240 products to fix' },
  { prompt: 'Recover yesterday\'s abandoned carts', skill: 'Cart Recovery',          result: '$8,420 in flight' },
  { prompt: 'Flag risky orders this morning',      skill: 'Fraud Watch',             result: '3 orders flagged' },
];

export default function UnifiedHero() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [beams, setBeams] = useState<{ id: number; nodeId: string }[]>([]);
  const [chips, setChips] = useState<ResultChip[]>([]);
  const [storePulse, setStorePulse] = useState(0);
  const [counter, setCounter] = useState(0);
  const [claudeIdx, setClaudeIdx] = useState(0);
  const [claudePhase, setClaudePhase] = useState<'thinking' | 'running' | 'done'>('thinking');

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

  // Claude assistant lifecycle: thinking → running → done → next task
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (claudePhase === 'thinking') {
      timer = setTimeout(() => setClaudePhase('running'), 1500);
    } else if (claudePhase === 'running') {
      timer = setTimeout(() => setClaudePhase('done'), 2000);
    } else if (claudePhase === 'done') {
      timer = setTimeout(() => {
        setClaudeIdx(i => (i + 1) % claudeTasks.length);
        setClaudePhase('thinking');
      }, 2000);
    }
    return () => clearTimeout(timer!);
  }, [claudePhase]);

  const claudeTask = claudeTasks[claudeIdx];

  return (
    <div className="uh-shell">
      {/* Claude assistant banner — a compact strip across the top */}
      <div className="uh-claude-banner">
        <div className="uh-cb-avatar">
          <ClaudeMark size={14} />
        </div>
        <div className="uh-cb-name">Claude</div>
        <div className="uh-cb-divider" />
        <div className="uh-cb-prompt">
          <span className="uh-cb-prompt-glyph">›</span>
          <span className="uh-cb-prompt-text">{claudeTask.prompt}</span>
        </div>
        <div className="uh-cb-status">
          {claudePhase === 'thinking' && (
            <span className="uh-cb-thinking">
              <span className="uh-cb-tdot" />
              <span className="uh-cb-tdot" />
              <span className="uh-cb-tdot" />
            </span>
          )}
          {claudePhase === 'running' && (
            <span className="uh-cb-skill">
              <span className="uh-cb-spinner" />
              <span className="uh-cb-skill-label">{claudeTask.skill}</span>
            </span>
          )}
          {claudePhase === 'done' && (
            <span className="uh-cb-result">
              <span className="uh-cb-tick">
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
              </span>
              <span>{claudeTask.result}</span>
            </span>
          )}
        </div>
      </div>

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
          const wp = bezierWaypoints(node, 30);
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
              {/* Bright comet head — sampled bezier waypoints so it
                  follows the visible curve, not a straight line. */}
              <motion.circle
                r="5"
                fill="#FFFFFF"
                initial={{ opacity: 0 }}
                animate={{
                  cx: wp.cx,
                  cy: wp.cy,
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

      {/* Routine nodes — clickable, hoverable */}
      {nodes.map(n => {
        const p = nodePosition(n);
        const isActive = activeId === n.id;
        return (
          <a
            key={n.id}
            href={n.href}
            className={`uh-node ${isActive ? 'is-active' : ''}`}
            style={{
              left: `${(p.x / CANVAS_W) * 100}%`,
              top: `${(p.y / CANVAS_H) * 100}%`,
              ['--node-color' as string]: n.color,
            }}
            aria-label={`${n.label} routine — ${n.schedule}`}
          >
            <div className="uh-node-icon" style={{ color: n.color }}>
              <NodeIcon kind={n.icon} />
            </div>
            <div className="uh-node-body">
              <div className="uh-node-name">{n.label}</div>
              <div className="uh-node-meta">{n.schedule}</div>
            </div>
          </a>
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
    </div>
  );
}

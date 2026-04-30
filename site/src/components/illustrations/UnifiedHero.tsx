import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './UnifiedHero.css';

/* ---------- types ---------- */
type Demo = {
  command: string;
  prelude: string;
  skillLabel: string;
  toolOutput: string[];
  closing: string;
};

type RoutineNode = {
  id: string;
  label: string;
  schedule: string;
  side: 'left' | 'right';
  row: 0 | 1 | 2;
  color: string;
  icon: 'sun' | 'box' | 'shield' | 'truck' | 'chart' | 'heart';
};

/* ---------- data ---------- */
const demos: Demo[] = [
  {
    command: "What's running low? Make me a restock list.",
    prelude: "Sure. I'll check every product and find the ones below your reorder point.",
    skillLabel: 'Low Stock Watchdog',
    toolOutput: [
      'Connecting to your store',
      'Reviewing 1,247 products',
      'Found 23 that need reordering',
      'Saved your restock list',
    ],
    closing: '23 products need reordering. Full list saved as a CSV you can hand to your supplier.',
  },
  {
    command: 'Find products missing SEO titles or descriptions.',
    prelude: "On it. Auditing every product for missing SEO data.",
    skillLabel: 'SEO Audit',
    toolOutput: [
      'Reviewing 1,247 products',
      'Checking titles and descriptions',
      '240 need attention',
      'Saved the gap report',
    ],
    closing: '240 products need SEO updates. Sorted by traffic so you can fix the biggest ones first.',
  },
  {
    command: 'Recover abandoned checkouts from yesterday.',
    prelude: "I'll pull abandoned checkouts and send personalized recovery emails.",
    skillLabel: 'Cart Recovery',
    toolOutput: [
      '47 abandoned checkouts',
      'Generating recovery codes',
      'Emails sent',
      'About $8,420 in flight',
    ],
    closing: 'Sent 47 recovery emails. Roughly $8,420 of cart value back in play.',
  },
  {
    command: 'Flag any high-risk orders from this morning.',
    prelude: 'Reviewing every new order and risk-scoring it.',
    skillLabel: 'Fraud Watch',
    toolOutput: [
      '184 new orders this morning',
      'Risk-scoring with Shopify signals',
      '3 orders look suspicious',
      'Flagged for your team',
    ],
    closing: '3 orders flagged for manual review. Your ops team will see them in their queue.',
  },
];

const routines: RoutineNode[] = [
  { id: 'morning', label: 'Morning Briefing', schedule: 'Every morning', side: 'left', row: 0, color: '#5B8DEF', icon: 'sun' },
  { id: 'lowstock', label: 'Low Stock Alerts', schedule: 'Every morning', side: 'left', row: 1, color: '#E87838', icon: 'box' },
  { id: 'fraud', label: 'Fraud Watch', schedule: 'Every 2 hours', side: 'left', row: 2, color: '#E85D75', icon: 'shield' },
  { id: 'shipping', label: 'Shipping Watch', schedule: 'Twice a day', side: 'right', row: 0, color: '#3DBB8F', icon: 'truck' },
  { id: 'weekly', label: 'Weekly Review', schedule: 'Mondays', side: 'right', row: 1, color: '#9B6EE3', icon: 'chart' },
  { id: 'churn', label: 'At-Risk Customers', schedule: 'Wednesdays', side: 'right', row: 2, color: '#5BB8A8', icon: 'heart' },
];

/* ---------- canvas geometry ---------- */
const CANVAS_W = 600;
const CANVAS_H = 360;
const CENTER_X = CANVAS_W / 2;
const CENTER_Y = CANVAS_H / 2;
const NODE_W = 184;
const NODE_H = 64;
const ROW_Y = [42, 148, 254];
const SIDE_X = { left: 14, right: CANVAS_W - NODE_W - 14 };

function nodeAnchor(n: RoutineNode): { x: number; y: number } {
  const x = n.side === 'left' ? SIDE_X.left + NODE_W : SIDE_X.right;
  const y = ROW_Y[n.row] + NODE_H / 2;
  return { x, y };
}

function pathFor(n: RoutineNode): string {
  const { x, y } = nodeAnchor(n);
  const dir = n.side === 'left' ? 1 : -1;
  const cx1 = x + dir * 80;
  const cy1 = y;
  const cx2 = CENTER_X - dir * 60;
  const cy2 = CENTER_Y;
  return `M ${x} ${y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${CENTER_X} ${CENTER_Y}`;
}

/* ---------- icons ---------- */
const ClaudeMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4.5c2 5 4 8 7 9.5-3 1.5-5 4.5-7 9.5-2-5-4-8-7-9.5 3-1.5 5-4.5 7-9.5z"
      fill="#DA7756"
    />
  </svg>
);

function NodeIcon({ kind }: { kind: RoutineNode['icon'] }) {
  const props = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
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

/* ---------- main component ---------- */
type Phase = 'typing' | 'thinking' | 'prelude' | 'tool' | 'output' | 'closing' | 'pause';

export default function UnifiedHero() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState('');
  const [outputIdx, setOutputIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [activeRoutine, setActiveRoutine] = useState<string | null>(null);
  const [beams, setBeams] = useState<{ id: number; nodeId: string }[]>([]);
  const [storePulse, setStorePulse] = useState(0);
  const [beamCounter, setBeamCounter] = useState(0);

  const demo = demos[demoIdx];

  /* ---------- chat phases ---------- */
  useEffect(() => {
    if (phase !== 'typing') return;
    if (typed.length === demo.command.length) {
      timerRef.current = setTimeout(() => setPhase('thinking'), 600);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => {
      setTyped(demo.command.slice(0, typed.length + 1));
    }, 32 + Math.random() * 22);
    return () => clearTimeout(timerRef.current!);
  }, [phase, typed, demo.command]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    timerRef.current = setTimeout(() => setPhase('prelude'), 1100);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'prelude') return;
    timerRef.current = setTimeout(() => setPhase('tool'), 900);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'tool') return;
    timerRef.current = setTimeout(() => setPhase('output'), 600);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'output') return;
    if (outputIdx >= demo.toolOutput.length) {
      timerRef.current = setTimeout(() => setPhase('closing'), 500);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => setOutputIdx(i => i + 1), 500);
    return () => clearTimeout(timerRef.current!);
  }, [phase, outputIdx, demo.toolOutput.length]);

  useEffect(() => {
    if (phase !== 'closing') return;
    timerRef.current = setTimeout(() => setPhase('pause'), 2600);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'pause') return;
    timerRef.current = setTimeout(() => {
      setTyped('');
      setOutputIdx(0);
      setDemoIdx(i => (i + 1) % demos.length);
      setPhase('typing');
    }, 600);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  /* ---------- routine beams ---------- */
  useEffect(() => {
    const iv = setInterval(() => {
      const next = routines[beamCounter % routines.length];
      const id = beamCounter;
      setBeams(prev => [...prev, { id, nodeId: next.id }]);
      setActiveRoutine(next.id);
      setBeamCounter(c => c + 1);
      setTimeout(() => setStorePulse(p => p + 1), 1100);
      setTimeout(() => setBeams(prev => prev.filter(b => b.id !== id)), 1700);
      setTimeout(() => setActiveRoutine(null), 1500);
    }, 1700);
    return () => clearInterval(iv);
  }, [beamCounter]);

  /* ---------- render ---------- */
  const showAssistant = phase !== 'typing';
  const showPrelude = ['prelude', 'tool', 'output', 'closing', 'pause'].includes(phase);
  const showTool = ['tool', 'output', 'closing', 'pause'].includes(phase);
  const showClosing = ['closing', 'pause'].includes(phase);

  return (
    <div className="uh-window">
      {/* macOS-ish title bar */}
      <div className="uh-title">
        <div className="uh-traffic">
          <span className="uh-light uh-light-red" />
          <span className="uh-light uh-light-yellow" />
          <span className="uh-light uh-light-green" />
        </div>
        <div className="uh-title-brand">
          <ClaudeMark size={12} />
          <span>Claude</span>
        </div>
        <div className="uh-title-spacer" />
      </div>

      {/* Region 1: chat */}
      <div className="uh-chat">
        <div className="uh-user">
          <div className="uh-user-bubble">
            {typed || ' '}
            {phase === 'typing' && <span className="uh-caret" />}
          </div>
        </div>

        <div className="uh-assistant">
          <div className="uh-row">
            <div className="uh-avatar"><ClaudeMark size={12} /></div>
            <div className="uh-row-content">
              {showAssistant && phase === 'thinking' ? (
                <span className="uh-thinking">
                  <span className="uh-thinking-dot" />
                  <span className="uh-thinking-dot" />
                  <span className="uh-thinking-dot" />
                </span>
              ) : (
                <span className={`uh-prose ${showPrelude ? 'is-shown' : ''}`}>{demo.prelude}</span>
              )}
            </div>
          </div>

          <div className="uh-row">
            <div className="uh-avatar uh-avatar-empty" />
            <div className="uh-row-content">
              <div className={`uh-tool ${showTool ? 'is-shown' : ''}`}>
                <div className="uh-tool-head">
                  <span className="uh-tool-spinner" />
                  <span className="uh-tool-running">Running</span>
                  <span className="uh-tool-name">{demo.skillLabel}</span>
                </div>
                <div className="uh-tool-output">
                  {demo.toolOutput.map((line, i) => (
                    <div
                      key={`${demoIdx}-${i}`}
                      className={`uh-tool-line ${i < outputIdx ? 'is-shown' : ''}`}
                    >
                      <span className="uh-tool-cont">·</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="uh-row">
            <div className="uh-avatar uh-avatar-empty" />
            <div className="uh-row-content">
              <span className={`uh-prose uh-prose-strong ${showClosing ? 'is-shown' : ''}`}>{demo.closing}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Soft divider with "while you sleep" eyebrow */}
      <div className="uh-divider">
        <span className="uh-divider-line" />
        <span className="uh-divider-text">
          <span className="uh-divider-pulse" />
          Always running
        </span>
        <span className="uh-divider-line" />
      </div>

      {/* Region 2: routine beams */}
      <div className="uh-beams">
        <svg width={CANVAS_W} height={CANVAS_H} viewBox={`0 0 ${CANVAS_W} ${CANVAS_H}`} preserveAspectRatio="xMidYMid meet" className="uh-beams-svg">
          {/* base paths, subtle dashed */}
          {routines.map(n => (
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

          {/* Comet beams — gradient stroke travels along path via dashoffset */}
          {beams.map(beam => {
            const node = routines.find(n => n.id === beam.nodeId)!;
            const gradId = `uh-grad-${beam.id}`;
            return (
              <g key={beam.id}>
                <defs>
                  <linearGradient id={gradId} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="60" y2="0">
                    <stop offset="0%" stopColor={node.color} stopOpacity="0" />
                    <stop offset="50%" stopColor={node.color} stopOpacity="1" />
                    <stop offset="100%" stopColor={node.color} stopOpacity="0" />
                  </linearGradient>
                </defs>
                {/* Soft halo trailing the comet */}
                <motion.path
                  d={pathFor(node)}
                  stroke={node.color}
                  strokeOpacity="0.35"
                  strokeWidth="6"
                  fill="none"
                  strokeLinecap="round"
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: [0, 1, 1], opacity: [0, 0.6, 0] }}
                  transition={{ duration: 1.5, ease: [0.4, 0, 0.2, 1], times: [0, 0.7, 1] }}
                  style={{ filter: 'blur(4px)' }}
                />
                {/* Bright comet head + trail */}
                <motion.path
                  d={pathFor(node)}
                  stroke={node.color}
                  strokeWidth="2.4"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="44 800"
                  initial={{ strokeDashoffset: 800, opacity: 0 }}
                  animate={{ strokeDashoffset: [800, -44], opacity: [0, 1, 1, 0] }}
                  transition={{ duration: 1.4, ease: [0.4, 0, 0.2, 1], times: [0, 0.15, 0.85, 1] }}
                  style={{ filter: `drop-shadow(0 0 6px ${node.color})` }}
                />
              </g>
            );
          })}
        </svg>

        {/* center store */}
        <motion.div
          key={`store-${storePulse}`}
          className="uh-store"
          initial={{ scale: 1 }}
          animate={{
            scale: [1, 1.04, 1],
            boxShadow: [
              '0 0 0 0 rgba(218,119,86,0.4)',
              '0 0 0 16px rgba(218,119,86,0)',
              '0 0 0 0 rgba(218,119,86,0)',
            ],
          }}
          transition={{ duration: 0.9, ease: 'easeOut' }}
          style={{ left: `${(CENTER_X / CANVAS_W) * 100}%`, top: `${(CENTER_Y / CANVAS_H) * 100}%` }}
        >
          <div className="uh-store-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <div className="uh-store-label">your store</div>
        </motion.div>

        {/* routine nodes */}
        {routines.map(node => {
          const x = node.side === 'left' ? SIDE_X.left : SIDE_X.right;
          const y = ROW_Y[node.row];
          const isActive = activeRoutine === node.id;
          return (
            <div
              key={node.id}
              className={`uh-node uh-node-${node.side} ${isActive ? 'is-active' : ''}`}
              style={{
                left: `${(x / CANVAS_W) * 100}%`,
                top: `${(y / CANVAS_H) * 100}%`,
                width: `${(NODE_W / CANVAS_W) * 100}%`,
                ['--node-color' as string]: node.color,
              }}
            >
              <div className="uh-node-icon" style={{ color: node.color }}>
                <NodeIcon kind={node.icon} />
              </div>
              <div className="uh-node-body">
                <div className="uh-node-name">{node.label}</div>
                <div className="uh-node-meta">{node.schedule}</div>
              </div>
              <AnimatePresence>
                {isActive && (
                  <motion.span
                    className="uh-node-spark"
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

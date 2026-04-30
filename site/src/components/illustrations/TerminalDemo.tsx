import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './TerminalDemo.css';

type Demo = {
  command: string;
  prelude: string;
  skillLabel: string;
  toolOutput: string[];
  closing: string;
};

// Plain language. Written for a store manager, not a developer.
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
    closing: '23 products need reordering — full list saved as a CSV you can hand to your supplier.',
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
    closing: 'Sent 47 recovery emails. Roughly $8,420 of cart value is now back in play.',
  },
  {
    command: 'Flag any high-risk orders from this morning.',
    prelude: "Reviewing every new order and risk-scoring it.",
    skillLabel: 'Fraud Watch',
    toolOutput: [
      '184 new orders this morning',
      'Risk-scoring with Shopify signals',
      '3 orders look suspicious',
      'Flagged for your team',
    ],
    closing: '3 orders flagged for manual review — your ops team will see them in their queue.',
  },
];

type Phase = 'typing' | 'thinking' | 'prelude' | 'tool' | 'output' | 'closing' | 'pause';

const ClaudeMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4.5c2 5 4 8 7 9.5-3 1.5-5 4.5-7 9.5-2-5-4-8-7-9.5 3-1.5 5-4.5 7-9.5z"
      fill="#DA7756"
    />
  </svg>
);

export default function ClaudeCodeChat() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState('');
  const [outputIdx, setOutputIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demo = demos[demoIdx];

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

  const showAssistant = phase !== 'typing';
  const showPrelude =
    phase === 'prelude' || phase === 'tool' || phase === 'output' || phase === 'closing' || phase === 'pause';
  const showTool =
    phase === 'tool' || phase === 'output' || phase === 'closing' || phase === 'pause';
  const showClosing = phase === 'closing' || phase === 'pause';

  return (
    <div className="cc-shell">
      {/* Minimal chrome — just lights and Claude mark, no model pill, no cwd */}
      <div className="cc-titlebar">
        <div className="cc-traffic">
          <span className="cc-light cc-light-red" />
          <span className="cc-light cc-light-yellow" />
          <span className="cc-light cc-light-green" />
        </div>
        <div className="cc-titlebar-brand">
          <ClaudeMark size={12} />
          <span>Claude</span>
        </div>
        <div className="cc-titlebar-spacer" />
      </div>

      <div className="cc-surface">
        {/* User turn */}
        <div className="cc-user">
          <div className="cc-user-bubble">
            {typed || ' '}
            {phase === 'typing' && <span className="cc-caret" />}
          </div>
        </div>

        {/* Assistant region — fixed-slot stack, blocks fade in by opacity, no reflow */}
        <div className="cc-assistant">
          <div className="cc-slot cc-slot-prelude">
            <div className="cc-avatar"><ClaudeMark size={12} /></div>
            <div className="cc-slot-content">
              {showAssistant && phase === 'thinking' ? (
                <span className="cc-thinking">
                  <span className="cc-thinking-dot" />
                  <span className="cc-thinking-dot" />
                  <span className="cc-thinking-dot" />
                </span>
              ) : (
                <span className={`cc-prose ${showPrelude ? 'is-shown' : ''}`}>{demo.prelude}</span>
              )}
            </div>
          </div>

          <div className="cc-slot cc-slot-tool">
            <div className="cc-avatar cc-avatar-empty" />
            <div className="cc-slot-content">
              <div className={`cc-tool-card ${showTool ? 'is-shown' : ''}`}>
                <div className="cc-tool-head">
                  <span className="cc-tool-spinner" />
                  <span className="cc-tool-running">Running</span>
                  <span className="cc-tool-name">{demo.skillLabel}</span>
                </div>
                <div className="cc-tool-output">
                  {demo.toolOutput.map((line, i) => (
                    <div
                      key={`${demoIdx}-${i}`}
                      className={`cc-tool-line ${i < outputIdx ? 'is-shown' : ''}`}
                    >
                      <span className="cc-tool-cont">·</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="cc-slot cc-slot-closing">
            <div className="cc-avatar cc-avatar-empty" />
            <div className="cc-slot-content">
              <span className={`cc-prose cc-prose-strong ${showClosing ? 'is-shown' : ''}`}>{demo.closing}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

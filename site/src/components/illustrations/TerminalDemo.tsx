import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './TerminalDemo.css';

type Demo = {
  command: string;
  skill: string;
  thought: string;
  result: string;
  resultMeta: string;
};

const demos: Demo[] = [
  {
    command: 'find variants below reorder threshold and export a restock list',
    skill: 'low-inventory-restock',
    thought: 'I\'ll scan all active variants and flag ones below their reorder threshold.',
    result: 'Found 23 SKUs that need reordering.',
    resultMeta: 'restock_2026-04-29.csv · 23 rows',
  },
  {
    command: 'audit products missing SEO titles or descriptions',
    skill: 'seo-metadata-audit',
    thought: 'Reviewing every product for title and description coverage.',
    result: '240 products need attention.',
    resultMeta: 'seo_audit_2026-04-29.csv · 240 rows',
  },
  {
    command: 'recover abandoned checkouts from the last 24 hours',
    skill: 'abandoned-cart-recovery',
    thought: 'Pulling abandoned checkouts and generating personalized recovery codes.',
    result: 'Sent 47 recovery emails.',
    resultMeta: '$8,420 in pending recovery',
  },
  {
    command: 'flag any high-risk orders from this morning',
    skill: 'high-risk-order-tagger',
    thought: 'Risk-scoring new orders against Shopify Fraud signals.',
    result: '3 orders flagged for manual review.',
    resultMeta: 'Tagged · risk:review',
  },
];

type Phase = 'typing' | 'thinking' | 'responding' | 'tool' | 'done' | 'pause';

const ClaudeMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
    <path
      d="M16 4.5c2 5 4 8 7 9.5-3 1.5-5 4.5-7 9.5-2-5-4-8-7-9.5 3-1.5 5-4.5 7-9.5z"
      fill="#DA7756"
    />
  </svg>
);

export default function ClaudeChatDemo() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demo = demos[demoIdx];

  // typing
  useEffect(() => {
    if (phase !== 'typing') return;
    if (typed.length === demo.command.length) {
      timerRef.current = setTimeout(() => setPhase('thinking'), 900);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => {
      setTyped(demo.command.slice(0, typed.length + 1));
    }, 28 + Math.random() * 22);
    return () => clearTimeout(timerRef.current!);
  }, [phase, typed, demo.command]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    timerRef.current = setTimeout(() => setPhase('responding'), 1500);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'responding') return;
    timerRef.current = setTimeout(() => setPhase('tool'), 1700);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'tool') return;
    timerRef.current = setTimeout(() => setPhase('done'), 1900);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'done') return;
    timerRef.current = setTimeout(() => setPhase('pause'), 3200);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'pause') return;
    timerRef.current = setTimeout(() => {
      setTyped('');
      setDemoIdx(i => (i + 1) % demos.length);
      setPhase('typing');
    }, 700);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  const showAssistant = phase !== 'typing';
  const showThought = phase === 'responding' || phase === 'tool' || phase === 'done' || phase === 'pause';
  const showTool = phase === 'tool' || phase === 'done' || phase === 'pause';
  const showResult = phase === 'done' || phase === 'pause';

  return (
    <div className="claude-app">
      <div className="claude-app-sidebar">
        <div className="sidebar-brand">
          <ClaudeMark size={14} />
          <span>Claude</span>
        </div>
        <div className="sidebar-section">
          <div className="sidebar-label">Recents</div>
          <div className="sidebar-item sidebar-item-active">Shopify store</div>
          <div className="sidebar-item">Inventory questions</div>
          <div className="sidebar-item">Customer outreach</div>
        </div>
      </div>

      <div className="claude-app-main">
        <div className="claude-app-titlebar">
          <div className="titlebar-title">Shopify store</div>
          <div className="titlebar-model">Sonnet 4.5</div>
        </div>

        <div className="claude-app-thread">
          {/* User turn */}
          <div className="claude-turn claude-turn-user">
            <div className="turn-bubble">
              {typed || ' '}
              {phase === 'typing' && <span className="turn-caret" />}
            </div>
          </div>

          {/* Assistant turn */}
          <AnimatePresence>
            {showAssistant && (
              <motion.div
                key={`a-${demoIdx}`}
                className="claude-turn claude-turn-assistant"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.35, ease: 'easeOut' }}
              >
                <div className="turn-avatar">
                  <ClaudeMark size={14} />
                </div>
                <div className="turn-content">
                  {phase === 'thinking' ? (
                    <div className="turn-thinking">
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                      <span className="thinking-dot" />
                    </div>
                  ) : (
                    <>
                      {showThought && (
                        <motion.p
                          className="turn-text"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.4 }}
                        >
                          {demo.thought}
                        </motion.p>
                      )}
                      {showTool && (
                        <motion.div
                          className="turn-tool"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3 }}
                        >
                          <div className="turn-tool-head">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>
                            </svg>
                            <span className="turn-tool-label">Used skill</span>
                            <code className="turn-tool-name">{demo.skill}</code>
                          </div>
                        </motion.div>
                      )}
                      {showResult && (
                        <motion.div
                          className="turn-result"
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4 }}
                        >
                          <p className="turn-text turn-text-strong">{demo.result}</p>
                          <div className="turn-result-meta">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                              <polyline points="14 2 14 8 20 8"/>
                            </svg>
                            <span>{demo.resultMeta}</span>
                          </div>
                        </motion.div>
                      )}
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="claude-app-composer">
          <div className="composer-pill">
            <span className="composer-placeholder">Ask anything about your store…</span>
            <div className="composer-actions">
              <span className="composer-skill-chip">/skill</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

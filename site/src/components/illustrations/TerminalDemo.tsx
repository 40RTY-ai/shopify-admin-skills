import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './TerminalDemo.css';

type LineKind = 'log' | 'success';
type Line = { kind: LineKind; text: string };

type Demo = {
  command: string;
  skill: string;
  lines: Line[];
  result: string;
};

const demos: Demo[] = [
  {
    command: 'find variants below reorder threshold',
    skill: 'low-inventory-restock',
    lines: [
      { kind: 'log', text: 'Connecting to my-store.myshopify.com' },
      { kind: 'log', text: 'Scanning 1,247 active variants' },
      { kind: 'success', text: '23 SKUs below reorder point' },
    ],
    result: 'Saved restock_2026-04-29.csv',
  },
  {
    command: 'audit products missing SEO titles',
    skill: 'seo-metadata-audit',
    lines: [
      { kind: 'log', text: 'Reviewing 1,247 products' },
      { kind: 'log', text: 'Checking title + description coverage' },
      { kind: 'success', text: '240 products need attention' },
    ],
    result: 'Saved seo_audit_2026-04-29.csv',
  },
  {
    command: 'recover abandoned checkouts last 24h',
    skill: 'abandoned-cart-recovery',
    lines: [
      { kind: 'log', text: 'Found 47 abandoned checkouts' },
      { kind: 'log', text: 'Generating unique recovery codes' },
      { kind: 'success', text: 'Sent 47 recovery emails' },
    ],
    result: '$8,420 in pending recovery',
  },
  {
    command: 'flag high-risk orders this morning',
    skill: 'high-risk-order-tagger',
    lines: [
      { kind: 'log', text: 'Reviewing 184 new orders' },
      { kind: 'log', text: 'Risk-scoring with Shopify Fraud signals' },
      { kind: 'success', text: '3 orders flagged for review' },
    ],
    result: 'Tagged 3 orders · risk:review',
  },
];

type Phase = 'typing' | 'thinking' | 'streaming' | 'result' | 'pause';

const ClaudeMark = ({ size = 14 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path
      d="M16 4.5c2 5 4 8 7 9.5-3 1.5-5 4.5-7 9.5-2-5-4-8-7-9.5 3-1.5 5-4.5 7-9.5z"
      fill="#DA7756"
    />
  </svg>
);

export default function TerminalDemo() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<Phase>('typing');
  const [typed, setTyped] = useState('');
  const [streamIdx, setStreamIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const demo = demos[demoIdx];

  // typing: 50–85ms per character — natural human cadence
  useEffect(() => {
    if (phase !== 'typing') return;
    if (typed.length === demo.command.length) {
      timerRef.current = setTimeout(() => setPhase('thinking'), 700);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => {
      setTyped(demo.command.slice(0, typed.length + 1));
    }, 55 + Math.random() * 40);
    return () => clearTimeout(timerRef.current!);
  }, [phase, typed, demo.command]);

  // thinking: pause for "Claude is responding..." dots
  useEffect(() => {
    if (phase !== 'thinking') return;
    timerRef.current = setTimeout(() => setPhase('streaming'), 1400);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  // streaming: reveal lines one-by-one
  useEffect(() => {
    if (phase !== 'streaming') return;
    if (streamIdx >= demo.lines.length) {
      timerRef.current = setTimeout(() => setPhase('result'), 700);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => setStreamIdx(i => i + 1), 850);
    return () => clearTimeout(timerRef.current!);
  }, [phase, streamIdx, demo.lines.length]);

  // result: hold for read
  useEffect(() => {
    if (phase !== 'result') return;
    timerRef.current = setTimeout(() => setPhase('pause'), 2600);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  // pause then advance
  useEffect(() => {
    if (phase !== 'pause') return;
    timerRef.current = setTimeout(() => {
      setTyped('');
      setStreamIdx(0);
      setDemoIdx(i => (i + 1) % demos.length);
      setPhase('typing');
    }, 800);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  const showSkillCard = phase === 'streaming' || phase === 'result' || phase === 'pause';
  const showResult = phase === 'result' || phase === 'pause';

  return (
    <div className="claude-chat">
      <div className="claude-chat-header">
        <div className="claude-chat-brand">
          <ClaudeMark size={16} />
          <span className="claude-chat-name">Claude</span>
          <span className="claude-chat-model">Sonnet 4.5</span>
        </div>
        <div className="claude-chat-status">
          <span className="status-pulse" />
          <span>connected to my-store</span>
        </div>
      </div>

      <div className="claude-chat-body">
        {/* User message */}
        <div className="claude-msg claude-msg-user">
          <div className="msg-avatar msg-avatar-user">you</div>
          <div className="msg-content">
            <div className="msg-text">
              {typed || ' '}
              {phase === 'typing' && <span className="msg-caret">▍</span>}
            </div>
          </div>
        </div>

        {/* Assistant message — streamed once typing done */}
        <AnimatePresence>
          {phase !== 'typing' && (
            <motion.div
              key={`msg-${demoIdx}`}
              className="claude-msg claude-msg-assistant"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            >
              <div className="msg-avatar msg-avatar-claude">
                <ClaudeMark size={14} />
              </div>
              <div className="msg-content">
                {phase === 'thinking' ? (
                  <div className="msg-thinking">
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                    <span className="thinking-dot" />
                  </div>
                ) : (
                  <>
                    {showSkillCard && (
                      <motion.div
                        className="msg-skill-card"
                        initial={{ opacity: 0, scale: 0.97 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.25 }}
                      >
                        <div className="skill-card-row">
                          <span className="skill-card-label">Running skill</span>
                          <code className="skill-card-name">{demo.skill}</code>
                        </div>
                      </motion.div>
                    )}

                    <div className="msg-stream">
                      {demo.lines.slice(0, streamIdx).map((line, i) => (
                        <motion.div
                          key={`${demoIdx}-line-${i}`}
                          className={`stream-line stream-${line.kind}`}
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.3, ease: 'easeOut' }}
                        >
                          <span className="stream-bullet">
                            {line.kind === 'success' ? '✓' : '·'}
                          </span>
                          <span className="stream-text">{line.text}</span>
                        </motion.div>
                      ))}
                    </div>

                    {showResult && (
                      <motion.div
                        className="msg-result"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                      >
                        <span className="result-tick">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                        <span>{demo.result}</span>
                      </motion.div>
                    )}
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

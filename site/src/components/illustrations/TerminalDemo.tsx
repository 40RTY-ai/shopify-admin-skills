import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './TerminalDemo.css';

type Demo = {
  command: string;
  prelude: string;
  toolCall: string;
  toolOutput: string[];
  closing: string;
};

const demos: Demo[] = [
  {
    command: 'find variants below reorder threshold and export a restock list',
    prelude: 'I\'ll scan all active variants for ones below their reorder threshold.',
    toolCall: 'shopify-admin-low-inventory-restock',
    toolOutput: [
      'Connected to my-store.myshopify.com',
      'Scanning 1,247 active variants…',
      'Found 23 SKUs below reorder point',
      'Saved restock_2026-04-29.csv',
    ],
    closing: '23 SKUs need reordering. CSV saved to your working directory.',
  },
  {
    command: 'audit products missing SEO titles or descriptions',
    prelude: 'Checking every product for title and description coverage.',
    toolCall: 'shopify-admin-seo-metadata-audit',
    toolOutput: [
      'Reviewing 1,247 products',
      'Cross-referencing 8 collections',
      '240 products need attention',
      'Saved seo_audit_2026-04-29.csv',
    ],
    closing: '240 products need SEO updates. Full list in seo_audit_2026-04-29.csv.',
  },
  {
    command: 'recover abandoned checkouts from the last 24 hours',
    prelude: 'Pulling abandoned checkouts and generating recovery codes.',
    toolCall: 'shopify-admin-abandoned-cart-recovery',
    toolOutput: [
      'Found 47 abandoned checkouts',
      'Generating unique discount codes',
      'Sending recovery emails',
      '$8,420 in pending recovery',
    ],
    closing: 'Sent 47 recovery emails. ~$8,420 of cart value in flight.',
  },
  {
    command: 'flag any high-risk orders from this morning',
    prelude: 'Risk-scoring new orders against Shopify Fraud signals.',
    toolCall: 'shopify-admin-high-risk-order-tagger',
    toolOutput: [
      'Reviewing 184 new orders',
      'Risk-scoring with Shopify signals',
      '3 orders flagged for review',
      'Tagged · risk:review',
    ],
    closing: '3 high-risk orders flagged. Tagged with `risk:review` for the ops team.',
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
      timerRef.current = setTimeout(() => setPhase('thinking'), 700);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => {
      setTyped(demo.command.slice(0, typed.length + 1));
    }, 28 + Math.random() * 22);
    return () => clearTimeout(timerRef.current!);
  }, [phase, typed, demo.command]);

  useEffect(() => {
    if (phase !== 'thinking') return;
    timerRef.current = setTimeout(() => setPhase('prelude'), 1200);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'prelude') return;
    timerRef.current = setTimeout(() => setPhase('tool'), 900);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'tool') return;
    timerRef.current = setTimeout(() => setPhase('output'), 700);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'output') return;
    if (outputIdx >= demo.toolOutput.length) {
      timerRef.current = setTimeout(() => setPhase('closing'), 600);
      return () => clearTimeout(timerRef.current!);
    }
    timerRef.current = setTimeout(() => setOutputIdx(i => i + 1), 600);
    return () => clearTimeout(timerRef.current!);
  }, [phase, outputIdx, demo.toolOutput.length]);

  useEffect(() => {
    if (phase !== 'closing') return;
    timerRef.current = setTimeout(() => setPhase('pause'), 2800);
    return () => clearTimeout(timerRef.current!);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'pause') return;
    timerRef.current = setTimeout(() => {
      setTyped('');
      setOutputIdx(0);
      setDemoIdx(i => (i + 1) % demos.length);
      setPhase('typing');
    }, 700);
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
      {/* Window chrome */}
      <div className="cc-titlebar">
        <div className="cc-traffic">
          <span className="cc-light cc-light-red" />
          <span className="cc-light cc-light-yellow" />
          <span className="cc-light cc-light-green" />
        </div>
        <div className="cc-titlebar-title">
          <ClaudeMark size={12} />
          <span>claude</span>
          <span className="cc-titlebar-sep">·</span>
          <span className="cc-titlebar-cwd">~/my-store</span>
        </div>
        <div className="cc-titlebar-model">sonnet 4.5</div>
      </div>

      {/* Conversation surface */}
      <div className="cc-surface">
        <div className="cc-thread">
          {/* User input echoed in the same surface */}
          <div className="cc-line cc-line-user">
            <span className="cc-glyph cc-glyph-prompt">&gt;</span>
            <span className="cc-line-text">
              {typed || ' '}
              {phase === 'typing' && <span className="cc-caret" />}
            </span>
          </div>

          {/* Assistant turn — fixed slots so nothing reflows */}
          <div className="cc-assistant">
            <div className={`cc-block cc-prelude ${showPrelude ? 'is-shown' : ''}`}>
              <span className="cc-glyph cc-glyph-mark">⏺</span>
              <span className="cc-line-text cc-prose">
                {phase === 'thinking' ? (
                  <span className="cc-thinking">
                    <span className="cc-thinking-dot" />
                    <span className="cc-thinking-dot" />
                    <span className="cc-thinking-dot" />
                  </span>
                ) : (
                  demo.prelude
                )}
              </span>
            </div>

            <AnimatePresence>
              {showTool && (
                <motion.div
                  key={`tool-${demoIdx}`}
                  className="cc-block cc-tool is-shown"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                >
                  <span className="cc-glyph cc-glyph-mark">⏺</span>
                  <div className="cc-tool-card">
                    <div className="cc-tool-head">
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
                      </svg>
                      <span>Skill</span>
                      <code>{demo.toolCall}</code>
                    </div>
                    <div className="cc-tool-output">
                      {demo.toolOutput.slice(0, outputIdx).map((line, i) => (
                        <div key={`${demoIdx}-${i}`} className="cc-tool-line">
                          <span className="cc-tool-cont">⎿</span>
                          <span>{line}</span>
                        </div>
                      ))}
                      {/* Reserved space for non-yet-shown lines so layout stays stable */}
                      {demo.toolOutput.slice(outputIdx).map((_, i) => (
                        <div key={`ph-${demoIdx}-${i}`} className="cc-tool-line cc-tool-line-placeholder">
                          <span className="cc-tool-cont">⎿</span>
                          <span> </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className={`cc-block cc-closing ${showClosing ? 'is-shown' : ''}`}>
              <span className="cc-glyph cc-glyph-mark">⏺</span>
              <span className="cc-line-text cc-prose cc-prose-strong">{demo.closing}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

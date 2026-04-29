import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './TerminalDemo.css';

type Step = {
  prompt: string;
  output: string[];
};

type Demo = {
  command: string;
  steps: Step[];
};

const demos: Demo[] = [
  {
    command: 'find variants below reorder threshold',
    steps: [
      { prompt: '↪ matching skill', output: ['shopify-admin-low-inventory-restock'] },
      {
        prompt: '↪ querying store',
        output: [
          '✓ Connected to my-store.myshopify.com',
          '✓ Scanning 1,247 active variants…',
          '✓ Found 23 SKUs below threshold',
        ],
      },
      { prompt: '↪ output', output: ['Saved restock_2026-04-29.csv (23 rows)'] },
    ],
  },
  {
    command: 'audit products missing SEO titles',
    steps: [
      { prompt: '↪ matching skill', output: ['shopify-admin-seo-metadata-audit'] },
      {
        prompt: '↪ querying store',
        output: [
          '✓ Auditing 1,247 products across 8 collections',
          '✓ 84 missing meta title',
          '✓ 156 missing meta description',
        ],
      },
      { prompt: '↪ output', output: ['Saved seo_audit_2026-04-29.csv (240 rows)'] },
    ],
  },
  {
    command: 'recover abandoned checkouts from last 24 hours',
    steps: [
      { prompt: '↪ matching skill', output: ['shopify-admin-abandoned-cart-recovery'] },
      {
        prompt: '↪ querying store',
        output: [
          '✓ Found 47 abandoned checkouts',
          '✓ Generating 47 unique recovery codes',
          '✓ Sent recovery emails',
        ],
      },
      { prompt: '↪ output', output: ['$8,420 in pending recovery'] },
    ],
  },
  {
    command: 'flag high-risk orders from this morning',
    steps: [
      { prompt: '↪ matching skill', output: ['shopify-admin-high-risk-order-tagger'] },
      {
        prompt: '↪ querying store',
        output: ['✓ Reviewing 184 orders', '✓ Risk-scoring with Shopify Fraud signals', '✓ 3 orders flagged'],
      },
      { prompt: '↪ output', output: ['Tagged 3 orders with `risk:review`'] },
    ],
  },
];

export default function TerminalDemo() {
  const [demoIdx, setDemoIdx] = useState(0);
  const [phase, setPhase] = useState<'typing' | 'running' | 'done'>('typing');
  const [typedCommand, setTypedCommand] = useState('');
  const [stepIdx, setStepIdx] = useState(0);
  const [outputLines, setOutputLines] = useState<string[]>([]);

  const demo = demos[demoIdx];

  // Type the command character-by-character
  useEffect(() => {
    if (phase !== 'typing') return;
    if (typedCommand.length === demo.command.length) {
      const t = setTimeout(() => setPhase('running'), 350);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => {
      setTypedCommand(demo.command.slice(0, typedCommand.length + 1));
    }, 28 + Math.random() * 22);
    return () => clearTimeout(t);
  }, [phase, typedCommand, demo.command]);

  // Stream steps + their output lines one by one
  useEffect(() => {
    if (phase !== 'running') return;
    if (stepIdx >= demo.steps.length) {
      const t = setTimeout(() => setPhase('done'), 1300);
      return () => clearTimeout(t);
    }
    const step = demo.steps[stepIdx];
    const allLines = [step.prompt, ...step.output];
    let i = 0;
    const interval = setInterval(() => {
      if (i >= allLines.length) {
        clearInterval(interval);
        setTimeout(() => setStepIdx(s => s + 1), 450);
        return;
      }
      setOutputLines(prev => [...prev, allLines[i]]);
      i++;
    }, 280);
    return () => clearInterval(interval);
  }, [phase, stepIdx, demo.steps]);

  // After done, advance to next demo
  useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => {
      setOutputLines([]);
      setTypedCommand('');
      setStepIdx(0);
      setDemoIdx(i => (i + 1) % demos.length);
      setPhase('typing');
    }, 1800);
    return () => clearTimeout(t);
  }, [phase]);

  return (
    <div className="terminal-demo">
      <div className="terminal-chrome">
        <div className="terminal-dots">
          <span className="dot dot-red" />
          <span className="dot dot-yellow" />
          <span className="dot dot-green" />
        </div>
        <div className="terminal-title">claude code · shopify-admin-skills</div>
        <div className="terminal-status">
          <span className="status-dot" />
          <span>connected</span>
        </div>
      </div>
      <div className="terminal-body">
        <div className="terminal-line terminal-prompt-line">
          <span className="terminal-glyph">$</span>
          <span className="terminal-prompt-text">claude</span>
        </div>
        <div className="terminal-line terminal-prompt-line">
          <span className="terminal-glyph terminal-glyph-accent">›</span>
          <span className="terminal-user-input">
            {typedCommand}
            {phase === 'typing' && <span className="terminal-caret">▍</span>}
          </span>
        </div>
        <AnimatePresence mode="popLayout">
          {outputLines.map((line, i) => (
            <motion.div
              key={`${demoIdx}-${i}`}
              className="terminal-line terminal-output"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              <span className={line.startsWith('↪') ? 'terminal-arrow' : 'terminal-tick'}>
                {line.startsWith('↪') || line.startsWith('✓') ? line.slice(0, 1) : ' '}
              </span>
              <span>{line.startsWith('↪') || line.startsWith('✓') ? line.slice(2) : line}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

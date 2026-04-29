import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import './RoutineFeed.css';

type Notification = {
  id: number;
  routine: string;
  schedule: string;
  message: string;
  metric: string;
  channel: string;
  color: string;
};

const POOL: Omit<Notification, 'id'>[] = [
  {
    routine: 'morning-store-briefing',
    schedule: '8:00 AM',
    message: 'Daily digest posted',
    metric: '47 orders · $12.4k revenue',
    channel: '#ops',
    color: '#5B8DEF',
  },
  {
    routine: 'low-stock-watchdog',
    schedule: 'just now',
    message: '3 SKUs hit reorder point',
    metric: 'Demand forecast updated',
    channel: '#inventory',
    color: '#E87838',
  },
  {
    routine: 'fraud-sentinel',
    schedule: '12 min ago',
    message: '1 high-risk order on hold',
    metric: 'Order #3845 · $1,840',
    channel: '#fraud-alerts',
    color: '#E85D75',
  },
  {
    routine: 'fulfillment-sla-watchdog',
    schedule: '47 min ago',
    message: '4 orders past 48h SLA',
    metric: 'Oldest: 73h pending',
    channel: '#fulfillment',
    color: '#3DBB8F',
  },
  {
    routine: 'abandoned-cart-patrol',
    schedule: '2h ago',
    message: '12 carts recovered',
    metric: '$3,240 in pending recovery',
    channel: '#growth',
    color: '#9B6EE3',
  },
  {
    routine: 'price-anomaly-scanner',
    schedule: '6:00 AM',
    message: '0 anomalies detected',
    metric: '1,247 prices verified',
    channel: '#ops',
    color: '#5BB8A8',
  },
  {
    routine: 'customer-churn-watch',
    schedule: 'Wed 8:00 AM',
    message: '8 customers at risk',
    metric: 'Win-back recommended',
    channel: '#retention',
    color: '#D4605A',
  },
  {
    routine: 'weekly-business-review',
    schedule: 'Mon 8:00 AM',
    message: 'WBR generated · saved to Slack canvas',
    metric: 'Revenue ↑ 14% WoW',
    channel: '#leadership',
    color: '#6B8CA8',
  },
];

export default function RoutineFeed() {
  const [items, setItems] = useState<Notification[]>([]);
  const [nextIdx, setNextIdx] = useState(0);
  const [counter, setCounter] = useState(0);

  // Seed the feed with the first three
  useEffect(() => {
    const seed: Notification[] = [
      { ...POOL[0], id: 0 },
      { ...POOL[1], id: 1 },
      { ...POOL[2], id: 2 },
    ];
    setItems(seed);
    setNextIdx(3);
    setCounter(3);
  }, []);

  // Push a new notification every ~2.4s
  useEffect(() => {
    const interval = setInterval(() => {
      setItems(prev => {
        const newItem: Notification = { ...POOL[nextIdx % POOL.length], id: counter };
        // Push new on top, keep max 4 visible
        return [newItem, ...prev].slice(0, 4);
      });
      setNextIdx(i => i + 1);
      setCounter(c => c + 1);
    }, 2400);
    return () => clearInterval(interval);
  }, [nextIdx, counter]);

  return (
    <div className="routine-feed">
      <div className="routine-feed-header">
        <div className="feed-pulse" />
        <span className="feed-label">routines · live</span>
        <span className="feed-count">{POOL.length} active</span>
      </div>
      <div className="routine-feed-list">
        <AnimatePresence initial={false}>
          {items.map((item, i) => (
            <motion.div
              key={item.id}
              className="routine-card"
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
              transition={{ type: 'spring', stiffness: 260, damping: 22 }}
              style={{
                ['--accent' as string]: item.color,
                opacity: Math.max(0.45, 1 - i * 0.18),
              }}
            >
              <div className="routine-card-icon" style={{ background: item.color }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              </div>
              <div className="routine-card-body">
                <div className="routine-card-head">
                  <span className="routine-card-name">{item.routine}</span>
                  <span className="routine-card-time">{item.schedule}</span>
                </div>
                <div className="routine-card-msg">{item.message}</div>
                <div className="routine-card-foot">
                  <span className="routine-card-metric">{item.metric}</span>
                  <span className="routine-card-channel">{item.channel}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

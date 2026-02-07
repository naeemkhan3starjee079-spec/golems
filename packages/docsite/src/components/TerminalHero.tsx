import {useState, useEffect} from 'react';
import styles from './TerminalHero.module.css';

interface GolemScene {
  name: string;
  emoji: string;
  lines: string[];
}

interface TerminalHeroProps {
  activeIndex: number;
  onTabClick?: (index: number) => void;
}

const scenes: GolemScene[] = [
  {
    name: 'ClaudeGolem',
    emoji: '\uD83E\uDD16',
    lines: [
      '$ golems status',
      '  \u2713 Telegram Bot: connected',
      '  \u2713 Night Shift: last run 4:02am (3 PRs)',
      '  \u2713 Zikaron: 12.4k embeddings, 2.3GB',
      '  \u2713 Morning briefing: sent 8:00am',
    ],
  },
  {
    name: 'EmailGolem',
    emoji: '\uD83D\uDCE7',
    lines: [
      '$ golems email --recent',
      '  \uD83D\uDCE7 12 emails scored (3 urgent)',
      '  \u2192 2 routed to RecruiterGolem',
      '  \u2192 1 routed to TellerGolem',
      '  \uD83D\uDCCB Follow-ups due: 2',
    ],
  },
  {
    name: 'RecruiterGolem',
    emoji: '\uD83D\uDCBC',
    lines: [
      '$ golems outreach --stats',
      '  \uD83D\uDCE4 47 sent, 12 replies, 3 interviews',
      '  \uD83C\uDFAF Practice: 28 sessions (Elo 1340)',
      '  \uD83D\uDCC8 Hot leads: TechCorp, Acme, Wispr',
      '  \u2713 Auto follow-ups: 5 pending',
    ],
  },
  {
    name: 'TellerGolem',
    emoji: '\uD83D\uDCB0',
    lines: [
      '$ golems teller --report 2026-02',
      '  \uD83D\uDCB0 Monthly: $847.20 (14 subs)',
      '  \uD83D\uDCCA Software $420, Professional $180',
      '  \u26A0\uFE0F Payment failed: Vercel Pro ($20)',
      '  \u2713 Tax categories assigned',
    ],
  },
  {
    name: 'JobGolem',
    emoji: '\uD83C\uDFAF',
    lines: [
      '$ golems jobs --hot',
      '  \uD83C\uDFAF 3 hot matches (score 8+)',
      '  Senior Engineer @ Acme (9.2)',
      '  Full Stack @ TechCorp (8.7)',
      '  \u2192 Auto-outreach sent to top match',
    ],
  },
];

// Default "golems status" overview — shown when no tab is manually selected
const statusOverview = [
  '\uD83E\uDD16 ClaudeGolem    \u2713 connected      3 PRs tonight',
  '\uD83D\uDCE7 EmailGolem     \u2713 12 scored       3 urgent',
  '\uD83D\uDCBC RecruiterGolem \u2713 47 sent         3 interviews',
  '\uD83D\uDCB0 TellerGolem    \u2713 $847 tracked    14 subs',
  '\uD83C\uDFAF JobGolem       \u2713 3 hot matches   score 8+',
  '\uD83C\uDF19 NightShift     \u2713 last: 4:02am    3 PRs',
];

export default function TerminalHero({activeIndex, onTabClick}: TerminalHeroProps) {
  const [manualTab, setManualTab] = useState<number | null>(null);
  const activeTab = manualTab ?? activeIndex;
  const scene = scenes[activeTab % scenes.length];
  const isOverview = manualTab === null && activeIndex === 0;

  const handleTabClick = (i: number) => {
    setManualTab(i);
    onTabClick?.(i);
  };

  // Reset manual override after 10s of no clicks
  useEffect(() => {
    if (manualTab !== null) {
      const timer = setTimeout(() => setManualTab(null), 10000);
      return () => clearTimeout(timer);
    }
  }, [manualTab]);

  return (
    <div className={styles.terminal}>
      {/* Title bar */}
      <div className={styles.titleBar}>
        <div className={styles.trafficLights}>
          <span className={styles.dot} data-color="red" />
          <span className={styles.dot} data-color="yellow" />
          <span className={styles.dot} data-color="green" />
        </div>
        <span className={styles.titleText}>golems</span>
        <div className={styles.titleSpacer} />
      </div>

      {/* Tab bar */}
      <div className={styles.tabBar}>
        {scenes.map((s, i) => (
          <button
            key={s.name}
            className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
            onClick={() => handleTabClick(i)}
            type="button"
          >
            <span className={styles.tabEmoji}>{s.emoji}</span>
            <span className={styles.tabName}>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Terminal content */}
      <div className={styles.content}>
        <div className={styles.prompt}>
          <span className={styles.promptSymbol}>🜔</span>
          <span className={styles.promptPath}>golems</span>
          <span className={styles.promptCaret}>&gt;</span>
        </div>
        {isOverview ? (
          <>
            <div
              className={styles.line}
              style={{animationDelay: '0ms'}}
            >
              $ golems status
            </div>
            {statusOverview.map((line, i) => (
              <div
                key={`overview-${i}`}
                className={styles.line}
                style={{animationDelay: `${(i + 1) * 100}ms`}}
              >
                {line}
              </div>
            ))}
          </>
        ) : (
          scene.lines.map((line, i) => (
            <div
              key={`${activeTab}-${i}`}
              className={styles.line}
              style={{animationDelay: `${i * 120}ms`}}
            >
              {line}
            </div>
          ))
        )}
        <div className={styles.cursor}>_</div>
      </div>
    </div>
  );
}

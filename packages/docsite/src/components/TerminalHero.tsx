import {useState} from 'react';
import styles from './TerminalHero.module.css';

interface GolemScene {
  name: string;
  emoji: string;
  lines: string[];
}

interface TerminalHeroProps {
  activeIndex: number;
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
    ],
  },
  {
    name: 'EmailGolem',
    emoji: '\uD83D\uDCE7',
    lines: [
      '$ golems email --recent',
      '  \uD83D\uDCE7 12 emails scored (3 urgent)',
      '  \u2192 2 routed to RecruiterGolem',
      '  \uD83D\uDCCB Follow-ups due: 2',
    ],
  },
  {
    name: 'RecruiterGolem',
    emoji: '\uD83D\uDCBC',
    lines: [
      '$ golems outreach --stats',
      '  \uD83D\uDCE4 47 sent, 12 replies, 3 interviews',
      '  \uD83C\uDFAF Practice: 28 sessions',
      '  \uD83D\uDCC8 Elo: 1340 (system-design)',
    ],
  },
  {
    name: 'TellerGolem',
    emoji: '\uD83D\uDCB0',
    lines: [
      '$ golems teller --report 2026-02',
      '  \uD83D\uDCB0 Monthly: $847.20 (14 subs)',
      '  \uD83D\uDCCA software $420, professional $180',
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
      '  \u2192 auto-outreach sent',
    ],
  },
];

export default function TerminalHero({activeIndex}: TerminalHeroProps) {
  const [manualTab, setManualTab] = useState<number | null>(null);
  const activeTab = manualTab ?? activeIndex;
  const scene = scenes[activeTab % scenes.length];

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
            onClick={() => setManualTab(i)}
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
        {scene.lines.map((line, i) => (
          <div
            key={`${activeTab}-${i}`}
            className={styles.line}
            style={{animationDelay: `${i * 120}ms`}}
          >
            {line}
          </div>
        ))}
        <div className={styles.cursor}>_</div>
      </div>
    </div>
  );
}

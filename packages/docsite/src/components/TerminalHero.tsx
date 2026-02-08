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
      '$ claude -c --resume',
      '  \uD83E\uDD16 Resuming session... context loaded',
      '  \uD83D\uDCC2 Working on: songscript',
      '  \uD83D\uDD04 Active sessions: 3',
      '  \uD83D\uDCBE Memory: Zikaron (sqlite-vec + bge-large)',
    ],
  },
  {
    name: 'EmailGolem',
    emoji: '\uD83D\uDCE7',
    lines: [
      '$ golems email --triage',
      '  \uD83D\uDCE7 Scanning inbox... 23 new emails',
      '  \uD83C\uDFF7\uFE0F  Recruiter: 8 | Finance: 3 | Dev: 12',
      '  \u270D\uFE0F  Drafting reply to hiring@startup.com',
      '  \u23F0 Follow-up due: 2 overdue, 5 this week',
    ],
  },
  {
    name: 'RecruiterGolem',
    emoji: '\uD83D\uDCBC',
    lines: [
      '$ golems recruit --find "senior frontend"',
      '  \uD83D\uDD0D Exa search... 47 contacts found',
      '  \uD83D\uDCCA Scoring: GitHub activity, blog posts, talks',
      '  \u2709\uFE0F  Drafting outreach (style-adapted)',
      '  \uD83C\uDFAF Interview practice: Elo 1450 \u2192 1520',
    ],
  },
  {
    name: 'TellerGolem',
    emoji: '\uD83D\uDCB0',
    lines: [
      '$ golems teller --briefing',
      '  \uD83D\uDCB0 Monthly spend: $2,847 (\u2193 12% vs last month)',
      '  \uD83C\uDFF7\uFE0F  SaaS $890 | Food $420 | Transport $310',
      '  \u26A0\uFE0F  Alert: AWS bill up 34% \u2014 check Lambda usage',
      '  \uD83D\uDCCB Tax deductions found: $1,240 (Schedule C)',
    ],
  },
  {
    name: 'JobGolem',
    emoji: '\uD83C\uDFAF',
    lines: [
      '$ golems jobs --matches',
      '  \uD83C\uDFAF 3 hot matches (>85% fit score)',
      '    \u2192 Senior Frontend @ Vercel (92%)',
      '    \u2192 Staff Eng @ Linear (88%)',
      '    \u2192 Founding Eng @ stealth AI (86%)',
      '  \uD83D\uDCEC Applied: 12 this week, 3 interviews',
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

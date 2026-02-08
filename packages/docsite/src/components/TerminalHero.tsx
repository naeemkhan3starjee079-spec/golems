import {useState, useEffect} from 'react';
import GolemMascot from './mascots/GolemMascot';
import type {MascotVariant} from './mascots/GolemMascot';
import styles from './TerminalHero.module.css';

interface GolemScene {
  name: string;
  emoji: string;
  lines: string[];
}

const MASCOT_CYCLE: MascotVariant[] = ['guardian', 'prague', 'neon', 'pixel', 'ink'];

interface TerminalHeroProps {
  activeIndex: number;
  onTabClick?: (index: number) => void;
  mascotVariant?: MascotVariant;
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

// Neofetch-style status lines (shown alongside mascot)
const statusLines = [
  {label: 'ClaudeGolem', value: '\u2713 connected \u00B7 3 PRs tonight', color: '#28c840'},
  {label: 'EmailGolem', value: '\u2713 12 scored \u00B7 3 urgent', color: '#40d4d4'},
  {label: 'RecruiterGolem', value: '\u2713 47 sent \u00B7 3 interviews', color: '#d4a040'},
  {label: 'TellerGolem', value: '\u2713 $847 tracked \u00B7 14 subs', color: '#d440d4'},
  {label: 'JobGolem', value: '\u2713 3 hot matches \u00B7 8+', color: '#ff5555'},
  {label: 'NightShift', value: '\u2713 last: 4:02am \u00B7 3 PRs', color: '#5555ff'},
];

// System info lines (like neofetch shows below the logo)
const systemInfo = [
  {label: 'OS', value: 'macOS + Railway'},
  {label: 'Shell', value: 'zsh + Claude Code'},
  {label: 'Memory', value: 'Zikaron (sqlite-vec)'},
  {label: 'Uptime', value: '47d 12h (Railway)'},
];

export default function TerminalHero({activeIndex, onTabClick, mascotVariant}: TerminalHeroProps) {
  const currentMascot = mascotVariant || MASCOT_CYCLE[activeIndex % MASCOT_CYCLE.length];
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
      <div className={styles.tabBar} role="tablist" aria-label="Golem terminal tabs">
        {scenes.map((s, i) => (
          <button
            key={s.name}
            className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
            onClick={() => handleTabClick(i)}
            type="button"
            role="tab"
            aria-selected={i === activeTab}
            aria-label={`${s.name} tab`}
          >
            <span className={styles.tabEmoji} aria-hidden="true">{s.emoji}</span>
            <span className={styles.tabName}>{s.name}</span>
          </button>
        ))}
      </div>

      {/* Terminal content */}
      <div className={styles.content} role="tabpanel" aria-label={`${scene.name} output`}>
        {isOverview ? (
          /* Neofetch-style layout: mascot left, status right */
          <div className={styles.neofetch}>
            <div className={styles.neofetchArt}>
              <GolemMascot variant={currentMascot} size="sm" />
            </div>
            <div className={styles.neofetchInfo}>
              <div className={styles.neofetchTitle}>
                <span style={{color: '#e59500'}}>golems</span>
                <span style={{color: '#666'}}>@</span>
                <span style={{color: '#28c840'}}>railway</span>
              </div>
              <div className={styles.neofetchSep}>──────────────────────</div>
              {statusLines.map((s, i) => (
                <div
                  key={s.label}
                  className={styles.neofetchLine}
                  style={{animationDelay: `${i * 80}ms`}}
                >
                  <span className={styles.neofetchLabel} style={{color: s.color}}>{s.label}</span>
                  <span className={styles.neofetchValue}>{s.value}</span>
                </div>
              ))}
              <div className={styles.neofetchSep}>──────────────────────</div>
              {systemInfo.map((s, i) => (
                <div
                  key={s.label}
                  className={styles.neofetchLine}
                  style={{animationDelay: `${(i + statusLines.length + 1) * 80}ms`}}
                >
                  <span className={styles.neofetchLabel} style={{color: '#e59500'}}>{s.label}</span>
                  <span className={styles.neofetchValue}>{s.value}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Individual golem view */
          <>
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
          </>
        )}
      </div>
    </div>
  );
}

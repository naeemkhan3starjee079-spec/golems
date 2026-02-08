import {useState, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import GolemMascot from '@site/src/components/mascots/GolemMascot';
import TelegramMock from '@site/src/components/TelegramMock';

import styles from './index.module.css';

/* ── Tab content: real CLI flows ───────────────────────────────── */

interface TerminalTab {
  id: string;
  label: string;
  emoji: string;
  lines: string[];
  /** true = show Clay Guardian mascot beside the output */
  showMascot?: boolean;
}

const tabs: TerminalTab[] = [
  {
    id: 'wizard',
    label: 'Wizard',
    emoji: '\u2728',
    showMascot: true,
    lines: [
      '$ golems wizard',
      '',
      '\x1b[33m=== GOLEMS SETUP WIZARD ===\x1b[0m',
      '',
      '\x1b[34mPhase 1: Prerequisites\x1b[0m',
      '  \x1b[32m\u2713\x1b[0m bun v1.2.4',
      '  \x1b[32m\u2713\x1b[0m Claude Code v2.1',
      '  \x1b[32m\u2713\x1b[0m 1Password CLI',
      '  \x1b[33m\u25CB\x1b[0m Railway CLI (optional)',
      '',
      '\x1b[34mPhase 2: Services\x1b[0m',
      '  \x1b[36m[1]\x1b[0m Telegram Bot \u2014 Chat + notifications',
      '  \x1b[36m[2]\x1b[0m Email Golem  \u2014 Triage + routing',
      '  \x1b[36m[3]\x1b[0m Job Golem    \u2014 Board scraping',
      '  \x1b[36m[4]\x1b[0m Night Shift  \u2014 4am improvements',
      '',
      '  Select services to enable [1-4, all]: \x1b[32mall\x1b[0m',
      '',
      '\x1b[34mPhase 3: Wiring\x1b[0m',
      '  \x1b[32m\u2713\x1b[0m Created ~/.golems-zikaron/',
      '  \x1b[32m\u2713\x1b[0m Installed LaunchAgents (4 services)',
      '  \x1b[32m\u2713\x1b[0m Wired MCP servers (zikaron, email, jobs)',
      '  \x1b[32m\u2713\x1b[0m Linked golems CLI to ~/bin',
      '',
      '\x1b[32m\u2714 Setup complete! Run \x1b[0mgolems status\x1b[32m to verify.\x1b[0m',
    ],
  },
  {
    id: 'status',
    label: 'Status',
    emoji: '\uD83D\uDCCA',
    lines: [
      '$ golems status',
      '',
      '\x1b[34m=== GOLEMS STATUS ===\x1b[0m',
      '',
      '  \x1b[32m\u2713\x1b[0m Telegram Bot     running (port 3847)',
      '  \x1b[32m\u2713\x1b[0m Ollama           running',
      '',
      '\x1b[34mLaunchAgents:\x1b[0m',
      '  \x1b[32m\u2713\x1b[0m nightshift',
      '  \x1b[32m\u2713\x1b[0m briefing',
      '  \x1b[32m\u2713\x1b[0m job-golem',
      '  \x1b[32m\u2713\x1b[0m email-golem',
      '  \x1b[32m\u2713\x1b[0m session-archiver',
      '',
      '\x1b[34mClaude Sessions:\x1b[0m 3 running',
      '\x1b[34mNight Shift Target:\x1b[0m songscript',
      '',
      '\x1b[34mSkills:\x1b[0m 34 loaded',
      '\x1b[34mTests:\x1b[0m 539 passing',
      '\x1b[34mMemory:\x1b[0m 200k+ chunks indexed',
    ],
  },
  {
    id: 'recruiter',
    label: 'Recruiter',
    emoji: '\uD83D\uDCBC',
    lines: [
      '$ golems recruit --practice',
      '',
      '\x1b[34m=== INTERVIEW PRACTICE ===\x1b[0m',
      '\x1b[33mElo: 1450 \u2192 tracking 7-step system\x1b[0m',
      '',
      '\x1b[36mStep 1: Introduction\x1b[0m',
      '  Q: "Tell me about a challenging technical project."',
      '',
      '  \x1b[32mYou:\x1b[0m "I built an autonomous agent ecosystem',
      '  that manages email triage, job searching, and',
      '  code deployment through persistent Claude sessions..."',
      '',
      '\x1b[36mFeedback:\x1b[0m',
      '  \x1b[32m\u2713\x1b[0m Strong opening with concrete system',
      '  \x1b[33m\u25CB\x1b[0m Add metrics (539 tests, 34 skills)',
      '  \x1b[33m\u25CB\x1b[0m Mention the constraint: Mac + Railway split',
      '',
      '\x1b[34mScore: 7.2/10\x1b[0m | \x1b[33mElo: +15\x1b[0m',
      '  \x1b[36mNext:\x1b[0m Step 2: Technical Deep Dive \u2192',
    ],
  },
  {
    id: 'email',
    label: 'Email',
    emoji: '\uD83D\uDCE7',
    lines: [
      '$ golems email --triage',
      '',
      '\x1b[34m=== EMAIL TRIAGE ===\x1b[0m',
      '\x1b[33mScanning inbox... 23 new emails\x1b[0m',
      '',
      '\x1b[31m\u26A0 URGENT (score 10):\x1b[0m',
      '  From: hiring@linear.dev',
      '  Subj: "Interview confirmation \u2014 Tuesday 2pm"',
      '  \x1b[32m\u2192 Routed to RecruiterGolem\x1b[0m',
      '',
      '\x1b[33mTRACKED (score 7-9):\x1b[0m',
      '  3 job status updates \u2192 RecruiterGolem',
      '  1 payment receipt ($49) \u2192 TellerGolem',
      '',
      '\x1b[36mROUTED:\x1b[0m',
      '  8 recruiter \u2192 RecruiterGolem',
      '  3 finance  \u2192 TellerGolem',
      '  12 dev     \u2192 ClaudeGolem',
      '',
      '\x1b[34mFollow-ups:\x1b[0m 2 overdue, 5 due this week',
    ],
  },
  {
    id: 'nightshift',
    label: 'NightShift',
    emoji: '\uD83C\uDF19',
    lines: [
      '$ golems logs nightshift --last',
      '',
      '\x1b[34m=== NIGHT SHIFT LOG (4:02am) ===\x1b[0m',
      '\x1b[33mTarget: songscript\x1b[0m',
      '',
      '\x1b[36m[4:02]\x1b[0m Scanning repo for improvements...',
      '\x1b[36m[4:05]\x1b[0m Found 3 items:',
      '  1. Missing error boundary in PlayerView',
      '  2. WhisperX timeout too short (30s \u2192 120s)',
      '  3. Dead import in utils/format.ts',
      '',
      '\x1b[36m[4:12]\x1b[0m Creating worktree: nightshift-songscript',
      '\x1b[36m[4:18]\x1b[0m Implementing fixes...',
      '\x1b[36m[4:31]\x1b[0m Running tests: \x1b[32m142 pass\x1b[0m, 0 fail',
      '\x1b[36m[4:33]\x1b[0m CodeRabbit review: \x1b[32mPASS\x1b[0m',
      '\x1b[36m[4:34]\x1b[0m Created PR: songscript#42',
      '',
      '\x1b[32m\u2714 Night Shift complete. 3 fixes, 1 PR.\x1b[0m',
      '\x1b[34mMorning briefing queued for 8am.\x1b[0m',
    ],
  },
];

/* ── Golems grid data ──────────────────────────────────────────── */

const golems = [
  {
    emoji: '\uD83E\uDD16',
    name: 'ClaudeGolem',
    desc: 'Persistent Telegram-bridged Claude session. Manages Night Shift, content generation, and interactive coding.',
    link: '/docs/golems/claude',
  },
  {
    emoji: '\uD83D\uDCE7',
    name: 'EmailGolem',
    desc: 'Scores, categorizes, and routes incoming email. Detects subscriptions and payment failures.',
    link: '/docs/golems/email',
  },
  {
    emoji: '\uD83D\uDCBC',
    name: 'RecruiterGolem',
    desc: 'Finds contacts via GitHub, Exa, Hunter. Manages outreach, follow-ups, and interview practice.',
    link: '/docs/golems/recruiter',
  },
  {
    emoji: '\uD83D\uDCB0',
    name: 'TellerGolem',
    desc: 'Tax categorization, payment failure alerts, monthly and annual expense reports.',
    link: '/docs/golems/teller',
  },
  {
    emoji: '\uD83C\uDFAF',
    name: 'JobGolem',
    desc: 'Scrapes Indeed, SecretTLV, Drushim, Goozali. Scores and surfaces hot matches.',
    link: '/docs/golems/job-golem',
  },
  {
    emoji: '\uD83C\uDF19',
    name: 'NightShift',
    desc: 'Autonomous 4am improvements. Rotates across repos, creates PRs, sends morning briefings.',
    link: '/docs/architecture',
  },
];

/* ── Render ANSI-like color codes to spans ─────────────────────── */

function renderLine(raw: string): ReactNode {
  // Parse \x1b[Xm escape codes
  const parts: ReactNode[] = [];
  let key = 0;
  const colorMap: Record<string, string> = {
    '0': '', // reset
    '31': '#ff5555',
    '32': '#28c840',
    '33': '#e59500',
    '34': '#6ab0f3',
    '36': '#40d4d4',
  };
  const regex = /\x1b\[(\d+)m/g;
  let lastIndex = 0;
  let currentColor = '';
  let match;

  while ((match = regex.exec(raw)) !== null) {
    // Text before this escape
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index);
      if (currentColor) {
        parts.push(<span key={key++} style={{color: currentColor}}>{text}</span>);
      } else {
        parts.push(<span key={key++}>{text}</span>);
      }
    }
    currentColor = colorMap[match[1]] || '';
    lastIndex = regex.lastIndex;
  }

  // Remaining text
  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex);
    if (currentColor) {
      parts.push(<span key={key++} style={{color: currentColor}}>{text}</span>);
    } else {
      parts.push(<span key={key++}>{text}</span>);
    }
  }

  return parts.length > 0 ? parts : raw;
}

/* ── Hero Section ──────────────────────────────────────────────── */

function HomepageHero() {
  const {siteConfig} = useDocusaurusContext();
  const [activeTab, setActiveTab] = useState(0);

  // Auto-cycle through tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % tabs.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  const currentTab = tabs[activeTab];

  return (
    <header className={styles.heroBanner} aria-label="Golems hero section">
      <div className={`container ${styles.heroGrid}`}>
        {/* ── TERMINAL (wide, left) ── */}
        <div className={styles.terminalArea}>
          {/* Compact header with logo + title inline */}
          <div className={styles.heroHeader}>
            <img
              src="/img/golems-logo.svg"
              alt="Golems"
              className={styles.heroLogoSmall}
            />
            <div className={styles.heroTitleGroup}>
              <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
              <div className={styles.heroTagline}>
                <span>Spawn</span>
                <span className={styles.arrow}>&rarr;</span>
                <span>Work</span>
                <span className={styles.arrow}>&rarr;</span>
                <span>Die</span>
                <span className={styles.arrow}>&rarr;</span>
                <span className={styles.highlight}>Remember</span>
              </div>
            </div>
          </div>

          {/* Terminal window */}
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
              {tabs.map((t, i) => (
                <button
                  key={t.id}
                  className={`${styles.tab} ${i === activeTab ? styles.tabActive : ''}`}
                  onClick={() => handleTabChange(i)}
                  type="button"
                  role="tab"
                  aria-selected={i === activeTab}
                >
                  <span className={styles.tabEmoji}>{t.emoji}</span>
                  <span className={styles.tabName}>{t.label}</span>
                </button>
              ))}
            </div>

            {/* Terminal content */}
            <div className={styles.content} role="tabpanel">
              {currentTab.showMascot ? (
                <div className={styles.wizardLayout}>
                  <div className={styles.wizardMascot}>
                    <GolemMascot variant="guardian" size="md" animated={false} />
                  </div>
                  <div className={styles.wizardOutput}>
                    {currentTab.lines.map((line, i) => (
                      <div
                        key={`${activeTab}-${i}`}
                        className={styles.line}
                        style={{animationDelay: `${i * 50}ms`}}
                      >
                        {renderLine(line)}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className={styles.terminalOutput}>
                  {currentTab.lines.map((line, i) => (
                    <div
                      key={`${activeTab}-${i}`}
                      className={styles.line}
                      style={{animationDelay: `${i * 50}ms`}}
                    >
                      {renderLine(line)}
                    </div>
                  ))}
                </div>
              )}
              <div className={styles.cursor}>_</div>
            </div>
          </div>

          {/* Action buttons below terminal */}
          <div className={styles.buttons}>
            <Link className={styles.primaryButton} to="/docs/getting-started">
              Get Started
            </Link>
            <Link className={styles.secondaryButton} to="/docs/architecture">
              Architecture
            </Link>
            <Link className={styles.tertiaryButton} to="https://github.com/EtanHey/golems">
              GitHub &rarr;
            </Link>
          </div>
        </div>

        {/* ── TELEGRAM (right sidebar, full height) ── */}
        <div className={styles.telegramArea}>
          <TelegramMock activeIndex={activeTab} onTopicClick={handleTabChange} />
        </div>
      </div>
    </header>
  );
}

/* ── Golems Section ────────────────────────────────────────────── */

function GolemsSection() {
  return (
    <section className={styles.golemsSection} aria-labelledby="golems-heading">
      <div className="container">
        <h2 id="golems-heading" className={styles.sectionTitle}>Meet the Golems</h2>
        <p className={styles.sectionSubtitle}>
          Each golem owns a domain, not an I/O channel
        </p>
        <div className={styles.golemGrid}>
          {golems.map((g) => (
            <Link key={g.name} to={g.link} className={styles.golemCard}>
              <div className={styles.golemCardHeader}>
                <div className={styles.golemEmoji}>{g.emoji}</div>
                <div className={styles.golemName}>{g.name}</div>
              </div>
              <p className={styles.golemDesc}>{g.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ── Architecture Section ──────────────────────────────────────── */

function ArchitectureSection() {
  return (
    <section className={styles.archSection} aria-labelledby="arch-heading">
      <div className="container">
        <h2 id="arch-heading" className={styles.sectionTitle}>How It Works</h2>
        <p className={styles.sectionSubtitle}>
          Mac is the brain, Railway is the body
        </p>
        <div className={styles.archDiagram}>
          <div className={styles.archBox}>
            <h3 className={styles.archBoxTitle}>Your Mac (Brain)</h3>
            <ul className={styles.archList}>
              <li>Telegram Bot</li>
              <li>Night Shift</li>
              <li>Zikaron Memory</li>
              <li>Notification Server</li>
            </ul>
          </div>
          <div className={styles.archArrow}>&harr;</div>
          <div className={styles.archBox}>
            <h3 className={styles.archBoxTitle}>Railway (Body)</h3>
            <ul className={styles.archList}>
              <li>Email Poller</li>
              <li>Job Scraper</li>
              <li>Briefing Generator</li>
              <li>Content Pipeline</li>
            </ul>
          </div>
        </div>
        <div style={{textAlign: 'center', marginTop: '1.5rem'}}>
          <Link className={styles.secondaryButton} to="/docs/architecture">
            Explore Architecture &rarr;
          </Link>
        </div>
      </div>
    </section>
  );
}

/* ── Page ──────────────────────────────────────────────────────── */

export default function Home(): ReactNode {
  return (
    <Layout
      title="Home"
      description="Autonomous AI agent ecosystem for Claude Code">
      <HomepageHero />
      <main>
        <GolemsSection />
        <ArchitectureSection />
      </main>
    </Layout>
  );
}

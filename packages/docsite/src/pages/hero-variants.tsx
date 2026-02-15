import {useState} from 'react';
import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import GolemMascot from '../components/mascots/GolemMascot';
import GolemsLogo from '@site/static/img/golems-logo.svg';
import styles from './hero-variants.module.css';

/* ══════════════════════════════════════════════════════════════
   Shared terminal content
   ══════════════════════════════════════════════════════════════ */

interface TermTab {
  id: string;
  label: string;
  emoji: string;
  lines: string[];
  showMascot?: boolean;
}

const termTabs: TermTab[] = [
  {
    id: 'wizard', label: 'Wizard', emoji: '\u2728', showMascot: true,
    lines: [
      '$ golems wizard',
      '',
      '\x1b[33m=== GOLEMS SETUP WIZARD ===\x1b[0m',
      '',
      '\x1b[34mPhase 1: Prerequisites\x1b[0m',
      '  \x1b[32m\u2713\x1b[0m bun v1.2.4',
      '  \x1b[32m\u2713\x1b[0m Claude Code v2.1',
      '  \x1b[32m\u2713\x1b[0m 1Password CLI',
      '',
      '\x1b[34mPhase 2: Services\x1b[0m',
      '  \x1b[36m[1]\x1b[0m Telegram Bot',
      '  \x1b[36m[2]\x1b[0m Email Golem',
      '  \x1b[36m[3]\x1b[0m Job Golem',
      '  \x1b[36m[4]\x1b[0m Night Shift',
      '',
      '  Select [1-4, all]: \x1b[32mall\x1b[0m',
      '',
      '\x1b[32m\u2714 Setup complete!\x1b[0m',
    ],
  },
  {
    id: 'status', label: 'Status', emoji: '\uD83D\uDCCA',
    lines: [
      '$ golems status',
      '',
      '\x1b[34m=== GOLEMS STATUS ===\x1b[0m',
      '',
      '  \x1b[32m\u2713\x1b[0m Telegram Bot     running',
      '  \x1b[32m\u2713\x1b[0m Ollama           running',
      '',
      '\x1b[34mLaunchAgents:\x1b[0m',
      '  \x1b[32m\u2713\x1b[0m nightshift',
      '  \x1b[32m\u2713\x1b[0m email-golem',
      '  \x1b[32m\u2713\x1b[0m job-golem',
      '',
      '\x1b[34mClaude:\x1b[0m 3 sessions',
      '\x1b[34mTests:\x1b[0m 539 passing',
    ],
  },
  {
    id: 'recruiter', label: 'Recruiter', emoji: '\uD83D\uDCBC',
    lines: [
      '$ golems recruit --practice',
      '',
      '\x1b[34m=== INTERVIEW PRACTICE ===\x1b[0m',
      '\x1b[33mElo: 1450\x1b[0m',
      '',
      '\x1b[36mStep 1: Introduction\x1b[0m',
      '  Q: "Tell me about a challenging project."',
      '',
      '  \x1b[32mYou:\x1b[0m "I built an autonomous agent',
      '  ecosystem that manages email, jobs..."',
      '',
      '\x1b[34mScore: 7.2/10\x1b[0m | \x1b[33mElo: +15\x1b[0m',
    ],
  },
];

/* ── ANSI renderer ── */
function renderLine(raw: string): ReactNode {
  const parts: ReactNode[] = [];
  let key = 0;
  const colorMap: Record<string, string> = {
    '0': '', '31': '#ff5555', '32': '#28c840',
    '33': '#e59500', '34': '#6ab0f3', '36': '#40d4d4',
  };
  const regex = /\x1b\[(\d+)m/g;
  let lastIndex = 0;
  let currentColor = '';
  let match;
  while ((match = regex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      const text = raw.slice(lastIndex, match.index);
      parts.push(currentColor
        ? <span key={key++} style={{color: currentColor}}>{text}</span>
        : <span key={key++}>{text}</span>);
    }
    currentColor = colorMap[match[1]] || '';
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < raw.length) {
    const text = raw.slice(lastIndex);
    parts.push(currentColor
      ? <span key={key++} style={{color: currentColor}}>{text}</span>
      : <span key={key++}>{text}</span>);
  }
  return parts.length > 0 ? parts : raw;
}

/* ══════════════════════════════════════════════════════════════
   Terminal chrome styles (5 distinct looks)
   ══════════════════════════════════════════════════════════════ */

type TermStyle = 'zed' | 'ghostty' | 'warp' | 'crt' | 'editorial';

interface TermStyleConfig {
  name: string;
  bg: string;
  border: string;
  titleBg: string;
  tabBg: string;
  tabActive: string;
  contentBg: string;
  textColor: string;
  dotStyle: 'macos' | 'line' | 'none';
  fontFamily: string;
  borderRadius: string;
  glow?: string;
  scanlines?: boolean;
}

const termStyleConfig: Record<TermStyle, TermStyleConfig> = {
  zed: {
    name: 'Zed Native', bg: '#1e1e1e', border: 'rgba(255,255,255,0.08)',
    titleBg: '#252525', tabBg: '#1e1e1e', tabActive: '#e59500',
    contentBg: '#1e1e1e', textColor: '#d4d4d4', dotStyle: 'macos',
    fontFamily: "'SF Mono', 'JetBrains Mono', monospace", borderRadius: '8px',
  },
  ghostty: {
    name: 'Ghostty Glass', bg: 'rgba(15,15,20,0.85)', border: 'rgba(255,255,255,0.12)',
    titleBg: 'rgba(20,20,30,0.9)', tabBg: 'rgba(15,15,20,0.7)', tabActive: '#a78bfa',
    contentBg: 'rgba(15,15,20,0.85)', textColor: '#e0dde5', dotStyle: 'macos',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace", borderRadius: '12px',
    glow: '0 0 60px rgba(167,139,250,0.15)',
  },
  warp: {
    name: 'Warp Modern', bg: '#0a0a0f', border: 'rgba(99,102,241,0.15)',
    titleBg: '#12121a', tabBg: '#0e0e14', tabActive: '#818cf8',
    contentBg: '#0a0a0f', textColor: '#c8c8d0', dotStyle: 'none',
    fontFamily: "'Inter', 'SF Pro', system-ui, sans-serif", borderRadius: '16px',
  },
  crt: {
    name: 'CRT Retro', bg: '#0a0f0a', border: 'rgba(0,255,65,0.2)',
    titleBg: '#0d120d', tabBg: '#0a0f0a', tabActive: '#00ff41',
    contentBg: '#0a0f0a', textColor: '#00ff41', dotStyle: 'none',
    fontFamily: "'VT323', 'Courier New', monospace", borderRadius: '4px',
    glow: '0 0 40px rgba(0,255,65,0.1)', scanlines: true,
  },
  editorial: {
    name: 'Editorial', bg: '#faf8f5', border: 'rgba(0,0,0,0.08)',
    titleBg: '#f0ece5', tabBg: '#faf8f5', tabActive: '#b07400',
    contentBg: '#faf8f5', textColor: '#2a2520', dotStyle: 'line',
    fontFamily: "'IBM Plex Mono', 'Courier', monospace", borderRadius: '2px',
  },
};

/* ── Reusable terminal component ── */
interface TermProps {
  style: TermStyle;
  activeTab: number;
  onTabClick: (i: number) => void;
  className?: string;
}

function TerminalVariant({style: termStyle, activeTab, onTabClick, className}: TermProps) {
  const cfg = termStyleConfig[termStyle];
  const tab = termTabs[activeTab % termTabs.length];

  return (
    <div
      className={`${styles.termVariant} ${className || ''}`}
      style={{
        background: cfg.bg, border: `1px solid ${cfg.border}`,
        borderRadius: cfg.borderRadius,
        boxShadow: cfg.glow || '0 12px 40px rgba(0,0,0,0.3)',
        fontFamily: cfg.fontFamily, position: 'relative', overflow: 'hidden',
      }}
    >
      {cfg.scanlines && <div className={styles.scanlines} />}

      <div className={styles.termTitleBar} style={{background: cfg.titleBg}}>
        {cfg.dotStyle === 'macos' && (
          <div className={styles.dots}>
            <span style={{background: '#ff5f57'}} />
            <span style={{background: '#ffbd2e'}} />
            <span style={{background: '#28c840'}} />
          </div>
        )}
        {cfg.dotStyle === 'line' && <div className={styles.editorialLine} />}
        <span className={styles.termTitleText} style={{color: cfg.textColor, opacity: 0.5}}>
          {cfg.name}
        </span>
      </div>

      <div className={styles.termTabs} style={{background: cfg.tabBg}}>
        {termTabs.map((t, i) => (
          <button
            key={t.id}
            onClick={() => onTabClick(i)}
            className={styles.termTab}
            style={{
              color: i === activeTab ? cfg.tabActive : (cfg.textColor + '80'),
              borderBottomColor: i === activeTab ? cfg.tabActive : 'transparent',
              fontFamily: cfg.fontFamily,
            }}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className={styles.termContent} style={{color: cfg.textColor}}>
        {tab.showMascot ? (
          <div className={styles.wizardGrid}>
            <div className={styles.mascotCol}>
              <GolemMascot variant="guardian" size="sm" animated={false} />
            </div>
            <div>
              {tab.lines.map((line, i) => (
                <div key={i} className={styles.termLine}>{renderLine(line)}</div>
              ))}
            </div>
          </div>
        ) : (
          tab.lines.map((line, i) => (
            <div key={i} className={styles.termLine}>{renderLine(line)}</div>
          ))
        )}
        <span className={styles.blinkCursor} style={{color: cfg.tabActive}}>_</span>
      </div>
    </div>
  );
}

/* ── Telegram mini mock ── */
function TelegramMini({className}: {className?: string}) {
  return (
    <div className={`${styles.telegramMini} ${className || ''}`}>
      <div className={styles.tgHeader}>
        <span className={styles.tgAvatar}>G</span>
        <div>
          <div className={styles.tgName}>GolemsBot</div>
          <div className={styles.tgStatus}>online</div>
        </div>
      </div>
      <div className={styles.tgMessages}>
        <div className={styles.tgMsg}>
          <span className={styles.tgMsgBot}>Night Shift complete</span>
          <span className={styles.tgTime}>4:34am</span>
        </div>
        <div className={styles.tgMsg}>
          <span className={styles.tgMsgBot}>PR songscript#42 created</span>
          <span className={styles.tgTime}>4:34am</span>
        </div>
        <div className={styles.tgMsg}>
          <span className={styles.tgMsgBot}>3 fixes, 142 tests pass</span>
          <span className={styles.tgTime}>4:35am</span>
        </div>
        <div className={`${styles.tgMsg} ${styles.tgMsgUser}`}>
          <span>nice, merge it</span>
          <span className={styles.tgTime}>8:12am</span>
        </div>
      </div>
    </div>
  );
}

/* ── Shared action buttons ── */
function ActionButtons({light}: {light?: boolean}) {
  return (
    <div className={styles.variantButtons}>
      <span className={styles.btnPrimary} style={{
        background: light ? '#1a1510' : 'linear-gradient(135deg, #e59500, #c46d3c)',
        color: light ? '#faf8f5' : '#0c0b0a',
      }}>Get Started</span>
      <span className={styles.btnSecondary} style={{
        color: light ? '#1a8a6e' : '#2dd4a8',
        borderColor: light ? 'rgba(26,138,110,0.3)' : 'rgba(45,212,168,0.25)',
      }}>Architecture</span>
      <span className={styles.btnTertiary} style={{
        color: light ? '#5a5040' : '#908575',
        borderColor: light ? 'rgba(90,80,64,0.2)' : 'rgba(144,133,117,0.2)',
      }}>GitHub &rarr;</span>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAYOUT 1: "Command Center" — Wide terminal + phone sidebar
   Current homepage layout. Zed terminal.
   ══════════════════════════════════════════════════════════════ */

function Layout1() {
  const [tab, setTab] = useState(0);
  return (
    <div className={styles.heroVariant} style={{background: '#0c0b0a'}}>
      <div className={styles.variantLabel}>
        <h3 style={{color: '#e59500'}}>1. Command Center</h3>
        <p style={{color: '#7c6f5e'}}>Wide terminal dominates. Telegram in phone frame sidebar. Buttons below terminal. Current homepage layout.</p>
      </div>
      <div className={styles.layoutCommandCenter}>
        <div className={styles.lcLeft}>
          <div className={styles.lcHeader}>
            <GolemsLogo className={styles.lcLogo} />
            <div>
              <h2 className={styles.lcTitle}>Golems</h2>
              <span className={styles.lcTagline}>Spawn &rarr; Work &rarr; Die &rarr; <em>Remember</em></span>
            </div>
          </div>
          <TerminalVariant style="zed" activeTab={tab} onTabClick={setTab} />
          <ActionButtons />
        </div>
        <div className={styles.lcPhone}>
          <div className={styles.phoneFrame}>
            <div className={styles.phoneNotch} />
            <TelegramMini className={styles.phoneTelegram} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAYOUT 2: "Split Screen" — 50/50 terminal & telegram
   Ghostty glass terminal. Equal columns.
   ══════════════════════════════════════════════════════════════ */

function Layout2() {
  const [tab, setTab] = useState(0);
  return (
    <div className={styles.heroVariant} style={{background: '#08080c'}}>
      <div className={styles.variantLabel}>
        <h3 style={{color: '#a78bfa'}}>2. Split Screen</h3>
        <p style={{color: '#6b6880'}}>Equal halves. Terminal left, Telegram right. Centered title + buttons below.</p>
      </div>
      <div className={styles.layoutSplitHeader}>
        <GolemsLogo className={styles.splitLogo} />
        <h2 className={styles.splitTitle}>Golems</h2>
        <span className={styles.splitTagline}>Autonomous AI agents for Claude Code</span>
      </div>
      <div className={styles.layoutSplit}>
        <TerminalVariant style="ghostty" activeTab={tab} onTabClick={setTab} />
        <div className={styles.splitRight}>
          <TelegramMini />
        </div>
      </div>
      <div className={styles.splitButtons}>
        <ActionButtons />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAYOUT 3: "Cinema" — Full-width terminal, floating telegram
   Warp modern terminal. Telegram overlay bottom-right.
   ══════════════════════════════════════════════════════════════ */

function Layout3() {
  const [tab, setTab] = useState(0);
  return (
    <div className={styles.heroVariant} style={{background: '#06060a'}}>
      <div className={styles.variantLabel}>
        <h3 style={{color: '#818cf8'}}>3. Cinema</h3>
        <p style={{color: '#5a5870'}}>Full-width terminal. Floating Telegram overlay. Immersive mode.</p>
      </div>
      <div className={styles.layoutCinema}>
        <div className={styles.cinemaHeader}>
          <GolemsLogo className={styles.cinemaLogo} />
          <h2 className={styles.cinemaTitle}>Golems</h2>
          <div className={styles.cinemaButtons}>
            <ActionButtons />
          </div>
        </div>
        <div className={styles.cinemaTermWrapper}>
          <TerminalVariant style="warp" activeTab={tab} onTabClick={setTab} />
          <div className={styles.cinemaOverlay}>
            <TelegramMini />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAYOUT 4: "Hacker Den" — CRT terminal center, ASCII mascot
   CRT retro. Mascot flanks the terminal.
   ══════════════════════════════════════════════════════════════ */

function Layout4() {
  const [tab, setTab] = useState(0);
  return (
    <div className={styles.heroVariant} style={{background: '#050a05'}}>
      <div className={styles.variantLabel}>
        <h3 style={{color: '#00ff41'}}>4. Hacker Den</h3>
        <p style={{color: '#3a6040'}}>CRT terminal with ASCII mascot beside it. Telegram as bottom strip. Raw hacker aesthetic.</p>
      </div>
      <div className={styles.layoutHacker}>
        <div className={styles.hackerCenter}>
          <div className={styles.hackerTitle}>
            <span className={styles.hackerGlyph}>&#x2588;&#x2588;</span>
            <span style={{color: '#00ff41', fontFamily: "'VT323', monospace", fontSize: '2rem'}}>GOLEMS v2.1</span>
            <span className={styles.hackerGlyph}>&#x2588;&#x2588;</span>
          </div>
          <div className={styles.hackerMain}>
            <div className={styles.hackerMascot}>
              <GolemMascot variant="guardian" size="md" animated={false} />
            </div>
            <TerminalVariant style="crt" activeTab={tab} onTabClick={setTab} className={styles.hackerTerm} />
          </div>
          <ActionButtons />
        </div>
        <div className={styles.hackerTelegram}>
          <TelegramMini />
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   LAYOUT 5: "Editorial" — Light theme, magazine layout
   Typography-first. Terminal as inline figure.
   ══════════════════════════════════════════════════════════════ */

function Layout5() {
  const [tab, setTab] = useState(0);
  return (
    <div className={styles.heroVariant} style={{background: '#faf8f5'}}>
      <div className={styles.variantLabel}>
        <h3 style={{color: '#1a1510'}}>5. Editorial</h3>
        <p style={{color: '#5a5040'}}>Light theme. Magazine layout. Typography-first. Terminal as inline figure with caption.</p>
      </div>
      <div className={styles.layoutEditorial}>
        <div className={styles.edHeader}>
          <GolemsLogo className={styles.edLogo} />
          <h2 className={styles.edTitle}>Golems</h2>
          <p className={styles.edSubtitle}>
            An autonomous AI agent ecosystem that works while you sleep.
            Email triage, job searching, interview practice, nightly code improvements
            &mdash; all orchestrated through Claude Code.
          </p>
          <ActionButtons light />
        </div>
        <div className={styles.edContent}>
          <div className={styles.edTermWrapper}>
            <TerminalVariant style="editorial" activeTab={tab} onTabClick={setTab} />
            <figcaption className={styles.edCaption}>
              The Golems CLI: wizard setup, live status, and recruiter practice.
            </figcaption>
          </div>
          <div className={styles.edTelegram}>
            <h4 className={styles.edTgLabel}>Live Telegram Feed</h4>
            <TelegramMini className={styles.edTelegramMini} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════ */

export default function HeroVariantsPage() {
  return (
    <Layout title="Hero Variants" description="5 hero layout variants with 5 terminal styles">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1>Hero Variants</h1>
          <p>5 distinct hero layouts + 5 terminal chrome styles. Pick your favorite.</p>
        </div>

        <Layout1 />
        <Layout2 />
        <Layout3 />
        <Layout4 />
        <Layout5 />
      </div>
    </Layout>
  );
}

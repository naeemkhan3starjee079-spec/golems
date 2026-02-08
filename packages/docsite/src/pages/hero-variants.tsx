import {useState} from 'react';
import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import GolemMascot from '../components/mascots/GolemMascot';
import styles from './hero-variants.module.css';

/* ══════════════════════════════════════════════════════════════
   Shared terminal content (same across all variants)
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
   Reusable terminal component with style variants
   ══════════════════════════════════════════════════════════════ */

type TermStyle = 'zed' | 'ghostty' | 'warp' | 'crt' | 'editorial';

interface TermProps {
  style: TermStyle;
  activeTab: number;
  onTabClick: (i: number) => void;
}

const termStyleConfig: Record<TermStyle, {
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
}> = {
  zed: {
    name: 'Zed Native',
    bg: '#1e1e1e', border: 'rgba(255,255,255,0.08)', titleBg: '#252525',
    tabBg: '#1e1e1e', tabActive: '#e59500', contentBg: '#1e1e1e',
    textColor: '#d4d4d4', dotStyle: 'macos',
    fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
    borderRadius: '8px',
  },
  ghostty: {
    name: 'Ghostty Glass',
    bg: 'rgba(15,15,20,0.85)', border: 'rgba(255,255,255,0.12)', titleBg: 'rgba(20,20,30,0.9)',
    tabBg: 'rgba(15,15,20,0.7)', tabActive: '#a78bfa', contentBg: 'rgba(15,15,20,0.85)',
    textColor: '#e0dde5', dotStyle: 'macos',
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    borderRadius: '12px',
    glow: '0 0 60px rgba(167,139,250,0.15)',
  },
  warp: {
    name: 'Warp Modern',
    bg: '#0a0a0f', border: 'rgba(99,102,241,0.15)', titleBg: '#12121a',
    tabBg: '#0e0e14', tabActive: '#818cf8', contentBg: '#0a0a0f',
    textColor: '#c8c8d0', dotStyle: 'none',
    fontFamily: "'Inter', 'SF Pro', system-ui, sans-serif",
    borderRadius: '16px',
  },
  crt: {
    name: 'CRT Retro',
    bg: '#0a0f0a', border: 'rgba(0,255,65,0.2)', titleBg: '#0d120d',
    tabBg: '#0a0f0a', tabActive: '#00ff41', contentBg: '#0a0f0a',
    textColor: '#00ff41', dotStyle: 'none',
    fontFamily: "'VT323', 'Courier New', monospace",
    borderRadius: '4px',
    glow: '0 0 40px rgba(0,255,65,0.1)',
    scanlines: true,
  },
  editorial: {
    name: 'Editorial',
    bg: '#faf8f5', border: 'rgba(0,0,0,0.08)', titleBg: '#f0ece5',
    tabBg: '#faf8f5', tabActive: '#b07400', contentBg: '#faf8f5',
    textColor: '#2a2520', dotStyle: 'line',
    fontFamily: "'IBM Plex Mono', 'Courier', monospace",
    borderRadius: '2px',
  },
};

function TerminalVariant({style: termStyle, activeTab, onTabClick}: TermProps) {
  const cfg = termStyleConfig[termStyle];
  const tab = termTabs[activeTab % termTabs.length];

  return (
    <div
      className={styles.termVariant}
      style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: cfg.borderRadius,
        boxShadow: cfg.glow || '0 12px 40px rgba(0,0,0,0.3)',
        fontFamily: cfg.fontFamily,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Scanlines for CRT */}
      {cfg.scanlines && <div className={styles.scanlines} />}

      {/* Title bar */}
      <div className={styles.termTitleBar} style={{background: cfg.titleBg}}>
        {cfg.dotStyle === 'macos' && (
          <div className={styles.dots}>
            <span style={{background: '#ff5f57'}} />
            <span style={{background: '#ffbd2e'}} />
            <span style={{background: '#28c840'}} />
          </div>
        )}
        {cfg.dotStyle === 'line' && (
          <div className={styles.editorialLine} />
        )}
        <span className={styles.termTitleText} style={{color: cfg.textColor, opacity: 0.5}}>
          {cfg.name}
        </span>
      </div>

      {/* Tab bar */}
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

      {/* Content */}
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

/* ══════════════════════════════════════════════════════════════
   Telegram Mock (minimal version for variants page)
   ══════════════════════════════════════════════════════════════ */

function TelegramMini() {
  return (
    <div className={styles.telegramMini}>
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

/* ══════════════════════════════════════════════════════════════
   5 Hero Layout Variants
   ══════════════════════════════════════════════════════════════ */

interface VariantInfo {
  id: string;
  name: string;
  desc: string;
  termStyle: TermStyle;
}

const variants: VariantInfo[] = [
  {id: 'terminal-first', name: 'Terminal First', desc: 'Wide terminal dominates. Telegram sidebar. Buttons below.', termStyle: 'zed'},
  {id: 'ghostty-glass', name: 'Ghostty Glass', desc: 'Frosted glass terminal. Purple accents. Ethereal.', termStyle: 'ghostty'},
  {id: 'warp-modern', name: 'Warp Modern', desc: 'Block-based commands. Rounded corners. App-like.', termStyle: 'warp'},
  {id: 'crt-retro', name: 'CRT Retro', desc: 'Phosphor green. Scanlines. Hacker nostalgia.', termStyle: 'crt'},
  {id: 'editorial', name: 'Editorial', desc: 'Light theme. Magazine layout. Typography-first.', termStyle: 'editorial'},
];

function HeroVariant({variant}: {variant: VariantInfo}) {
  const [activeTab, setActiveTab] = useState(0);
  const isEditorial = variant.termStyle === 'editorial';

  return (
    <div
      className={styles.heroVariant}
      style={{background: isEditorial ? '#f8f5ef' : '#0c0b0a'}}
    >
      <div className={styles.variantLabel}>
        <h3 style={{color: isEditorial ? '#1a1510' : '#e59500'}}>{variant.name}</h3>
        <p style={{color: isEditorial ? '#5a5040' : '#7c6f5e'}}>{variant.desc}</p>
      </div>

      <div className={styles.variantGrid}>
        {/* Terminal (wide) */}
        <div className={styles.variantTerminal}>
          <TerminalVariant
            style={variant.termStyle}
            activeTab={activeTab}
            onTabClick={setActiveTab}
          />
          {/* Buttons below terminal */}
          <div className={styles.variantButtons}>
            <span className={styles.btnPrimary} style={{
              background: isEditorial ? '#1a1510' : 'linear-gradient(135deg, #e59500, #c46d3c)',
              color: isEditorial ? '#faf8f5' : '#0c0b0a',
            }}>Get Started</span>
            <span className={styles.btnSecondary} style={{
              color: isEditorial ? '#1a8a6e' : '#2dd4a8',
              borderColor: isEditorial ? 'rgba(26,138,110,0.3)' : 'rgba(45,212,168,0.25)',
            }}>Architecture</span>
          </div>
        </div>

        {/* Telegram (sidebar) */}
        <TelegramMini />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════ */

export default function HeroVariantsPage() {
  return (
    <Layout title="Hero Variants" description="5 hero layout + terminal style variants">
      <div className={styles.page}>
        <div className={styles.pageHeader}>
          <h1>Hero Variants</h1>
          <p>5 terminal chrome styles + hero layouts. Pick your favorite.</p>
        </div>

        {variants.map((v) => (
          <HeroVariant key={v.id} variant={v} />
        ))}
      </div>
    </Layout>
  );
}

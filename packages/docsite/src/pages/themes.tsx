import {useState, useCallback} from 'react';
import type {ReactNode} from 'react';
import Layout from '@theme/Layout';
import Link from '@docusaurus/Link';
import GolemMascot from '@site/src/components/mascots/GolemMascot';
import TelegramMock from '@site/src/components/TelegramMock';
import GolemsLogo from '@site/static/img/golems-logo.svg';
import styles from './themes.module.css';

/* ══════════════════════════════════════════════════════════════
   5 Color Themes — same layout, different palettes
   ══════════════════════════════════════════════════════════════ */

interface ColorTheme {
  id: string;
  name: string;
  desc: string;
  bg: string;
  bgGradient: string;
  accent: string;
  accentSecondary: string;
  accentGlow: string;
  text: string;
  textMuted: string;
  textDim: string;
  termBg: string;
  termBorder: string;
  termTitleBg: string;
  termTabActive: string;
  termText: string;
  cardBg: string;
  cardBorder: string;
  highlight: string;
  highlightGlow: string;
  btnGradient: string;
  btnText: string;
  swatch: string;
  logoHueRotate: number;
  mascotColors: { clay: string; accent: string; glow: string; bg: string };
}

const themes: ColorTheme[] = [
  {
    id: 'ember-forge',
    name: 'Ember Forge',
    desc: 'Warm copper & terracotta. The original look.',
    bg: '#0e0a07', bgGradient: 'linear-gradient(180deg, #0e0a07, #0a0705)',
    accent: '#e07a3f', accentSecondary: '#f2b768',
    accentGlow: 'rgba(224, 122, 63, 0.20)',
    text: '#f7efe9', textMuted: '#cdbfb2', textDim: '#9c8c7f',
    termBg: '#140e0a', termBorder: 'rgba(224, 122, 63, 0.15)',
    termTitleBg: '#1b120d', termTabActive: '#e07a3f', termText: '#f5e3d4',
    cardBg: 'rgba(21, 16, 12, 0.9)', cardBorder: 'rgba(224, 122, 63, 0.10)',
    highlight: '#3fb6e0', highlightGlow: 'rgba(63, 182, 224, 0.35)',
    btnGradient: 'linear-gradient(135deg, #e07a3f, #f2b768)', btnText: '#1a110b',
    swatch: '#e07a3f',
    logoHueRotate: 0,
    mascotColors: { clay: '#c4783c', accent: '#8b7355', glow: '#ffb020', bg: '#1a1510' },
  },
  {
    id: 'deep-current',
    name: 'Deep Current',
    desc: 'Cool ocean depths with crisp teal energy.',
    bg: '#071016', bgGradient: 'linear-gradient(180deg, #071016, #050b10)',
    accent: '#2db7a3', accentSecondary: '#6ad3c7',
    accentGlow: 'rgba(45, 183, 163, 0.18)',
    text: '#e7f5f4', textMuted: '#b8d3d0', textDim: '#8ca7a4',
    termBg: '#0a1319', termBorder: 'rgba(45, 183, 163, 0.12)',
    termTitleBg: '#0d1a21', termTabActive: '#2db7a3', termText: '#d7f1ee',
    cardBg: 'rgba(12, 20, 27, 0.9)', cardBorder: 'rgba(45, 183, 163, 0.08)',
    highlight: '#3f6fe0', highlightGlow: 'rgba(63, 111, 224, 0.35)',
    btnGradient: 'linear-gradient(135deg, #2db7a3, #6ad3c7)', btnText: '#051015',
    swatch: '#2db7a3',
    logoHueRotate: 148,
    mascotColors: { clay: '#2db7a3', accent: '#1a7a70', glow: '#6ad3c7', bg: '#071016' },
  },
  {
    id: 'neon-arcade',
    name: 'Neon Arcade',
    desc: 'Synthwave pink & cyan. Electric vibes.',
    bg: '#0a0612', bgGradient: 'linear-gradient(180deg, #0a0612, #07040d)',
    accent: '#ff4fd8', accentSecondary: '#4fe8ff',
    accentGlow: 'rgba(255, 79, 216, 0.20)',
    text: '#f6f2ff', textMuted: '#c8c0da', textDim: '#9a8fb8',
    termBg: '#0e0818', termBorder: 'rgba(255, 79, 216, 0.12)',
    termTitleBg: '#120a1e', termTabActive: '#ff4fd8', termText: '#f1e6ff',
    cardBg: 'rgba(17, 10, 29, 0.9)', cardBorder: 'rgba(255, 79, 216, 0.08)',
    highlight: '#7cff57', highlightGlow: 'rgba(124, 255, 87, 0.40)',
    btnGradient: 'linear-gradient(135deg, #ff4fd8, #4fe8ff)', btnText: '#0a0612',
    swatch: '#ff4fd8',
    logoHueRotate: 288,
    mascotColors: { clay: '#ff4fd8', accent: '#a030a0', glow: '#4fe8ff', bg: '#0a0612' },
  },
  {
    id: 'tokyo-nocturne',
    name: 'Tokyo Nocturne',
    desc: 'Deep blue nights with violet neon edges.',
    bg: '#080b14', bgGradient: 'linear-gradient(180deg, #080b14, #06080f)',
    accent: '#7b5cff', accentSecondary: '#b39bff',
    accentGlow: 'rgba(123, 92, 255, 0.18)',
    text: '#eef0ff', textMuted: '#c5cae6', textDim: '#9097b8',
    termBg: '#0b0f1b', termBorder: 'rgba(123, 92, 255, 0.12)',
    termTitleBg: '#101629', termTabActive: '#7b5cff', termText: '#e4e7ff',
    cardBg: 'rgba(13, 17, 31, 0.9)', cardBorder: 'rgba(123, 92, 255, 0.08)',
    highlight: '#27d4a8', highlightGlow: 'rgba(39, 212, 168, 0.40)',
    btnGradient: 'linear-gradient(135deg, #7b5cff, #b39bff)', btnText: '#090b14',
    swatch: '#7b5cff',
    logoHueRotate: 231,
    mascotColors: { clay: '#7b5cff', accent: '#5040b0', glow: '#b39bff', bg: '#080b14' },
  },
  {
    id: 'mono-forest',
    name: 'Mono Forest',
    desc: 'Minimal monochrome with refined green pop.',
    bg: '#0b0c0d', bgGradient: 'linear-gradient(180deg, #0b0c0d, #080909)',
    accent: '#44d17a', accentSecondary: '#8be8b0',
    accentGlow: 'rgba(68, 209, 122, 0.15)',
    text: '#f2f4f4', textMuted: '#c6cacc', textDim: '#90989a',
    termBg: '#0f1112', termBorder: 'rgba(68, 209, 122, 0.10)',
    termTitleBg: '#141718', termTabActive: '#44d17a', termText: '#e6eaea',
    cardBg: 'rgba(16, 18, 19, 0.9)', cardBorder: 'rgba(68, 209, 122, 0.06)',
    highlight: '#4d8bff', highlightGlow: 'rgba(77, 139, 255, 0.35)',
    btnGradient: 'linear-gradient(135deg, #44d17a, #8be8b0)', btnText: '#0a0c0d',
    swatch: '#44d17a',
    logoHueRotate: 123,
    mascotColors: { clay: '#44d17a', accent: '#2a8050', glow: '#8be8b0', bg: '#0b0c0d' },
  },
];

/* ── ANSI renderer ── */
function renderLine(raw: string, theme: ColorTheme): ReactNode {
  const parts: ReactNode[] = [];
  let key = 0;
  const colorMap: Record<string, string> = {
    '0': '',
    '31': '#ff5555',
    '32': theme.highlight,
    '33': theme.accent,
    '34': theme.termTabActive,
    '36': '#40d4d4',
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

/* ── Terminal tab content ── */
const termLines = [
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
];

const golems = [
  {emoji: '\uD83E\uDD16', name: 'ClaudeGolem', desc: 'Persistent Telegram-bridged Claude session'},
  {emoji: '\uD83D\uDCE7', name: 'EmailGolem', desc: 'Scores, categorizes, routes incoming email'},
  {emoji: '\uD83D\uDCBC', name: 'RecruiterGolem', desc: 'Contacts, outreach, interview practice'},
  {emoji: '\uD83D\uDCB0', name: 'TellerGolem', desc: 'Tax categorization, expense reports'},
  {emoji: '\uD83C\uDFAF', name: 'JobGolem', desc: 'Board scraping, match scoring'},
  {emoji: '\uD83C\uDF19', name: 'NightShift', desc: 'Autonomous 4am improvements'},
];

/* ══════════════════════════════════════════════════════════════
   Full themed homepage preview
   ══════════════════════════════════════════════════════════════ */

function ThemedHomepage({theme, onBack}: {theme: ColorTheme; onBack: () => void}) {
  return (
    <div style={{background: theme.bg, minHeight: '100vh'}}>
      {/* Floating back button */}
      <button
        className={styles.backButton}
        onClick={onBack}
        style={{borderColor: theme.accent}}
        type="button"
      >
        <span style={{color: theme.accent}}>&larr; Back to themes</span>
      </button>

      {/* Hero */}
      <header className={styles.themeHero} style={{background: theme.bg}}>
        <div className={styles.themeHeroInner}>
          <div className={styles.themeTermArea}>
            <div className={styles.themeHeader}>
              <GolemsLogo className={styles.themeLogo} style={{filter: `hue-rotate(${theme.logoHueRotate}deg) drop-shadow(0 0 20px ${theme.accentGlow})`}} />
              <div>
                <h1 className={styles.themeTitle} style={{
                  background: `linear-gradient(135deg, ${theme.text} 0%, ${theme.accent} 100%)`,
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>Golems</h1>
                <div className={styles.themeTagline}>
                  <span style={{color: theme.textMuted}}>Spawn</span>
                  <span style={{color: theme.accentSecondary, opacity: 0.7}}>&rarr;</span>
                  <span style={{color: theme.textMuted}}>Work</span>
                  <span style={{color: theme.accentSecondary, opacity: 0.7}}>&rarr;</span>
                  <span style={{color: theme.textMuted}}>Die</span>
                  <span style={{color: theme.accentSecondary, opacity: 0.7}}>&rarr;</span>
                  <span style={{color: theme.highlight, textShadow: `0 0 16px ${theme.highlightGlow}`}}>Remember</span>
                </div>
              </div>
            </div>

            {/* Terminal */}
            <div className={styles.themeTerm} style={{
              background: theme.termBg,
              border: `1px solid ${theme.termBorder}`,
            }}>
              <div className={styles.themeTermTitle} style={{background: theme.termTitleBg, borderColor: theme.termBorder}}>
                <div className={styles.themeTermDots}>
                  <span style={{background: '#ff5f57'}} />
                  <span style={{background: '#ffbd2e'}} />
                  <span style={{background: '#28c840'}} />
                </div>
                <span style={{color: theme.textDim, fontSize: '0.72rem', flex: 1, textAlign: 'center'}}>golems</span>
              </div>
              <div className={styles.themeTermContent} style={{color: theme.termText}}>
                <div className={styles.themeWizardGrid}>
                  <div className={styles.themeWizardMascot}>
                    <GolemMascot variant="guardian" size="sm" animated={false} colors={theme.mascotColors} />
                  </div>
                  <div>
                    {termLines.map((line, i) => (
                      <div key={i} className={styles.themeTermLine}>{renderLine(line, theme)}</div>
                    ))}
                  </div>
                </div>
                <span style={{color: theme.termTabActive}}>_</span>
              </div>
            </div>

            {/* Buttons */}
            <div className={styles.themeButtons}>
              <span className={styles.themeBtn} style={{background: theme.btnGradient, color: theme.btnText}}>Get Started</span>
              <span className={styles.themeBtn} style={{background: 'transparent', color: theme.highlight, border: `1px solid ${theme.highlight}40`}}>Architecture</span>
              <span className={styles.themeBtn} style={{background: 'transparent', color: theme.textDim, border: `1px solid ${theme.textDim}30`}}>GitHub &rarr;</span>
            </div>
          </div>

          {/* Phone */}
          <div className={styles.themePhone}>
            <div className={styles.themePhoneFrame}>
              <div className={styles.themePhoneDI} />
              <TelegramMock activeIndex={0} accentColor={theme.accent} />
              <div className={styles.themePhoneHome} />
            </div>
          </div>
        </div>
      </header>

      {/* Get Started */}
      <section className={styles.themeSection} style={{borderTopColor: `${theme.accent}30`}}>
        <div className={styles.themeSectionInner}>
          <h2 style={{color: theme.text}}>Get Started in 60 Seconds</h2>
          <p style={{color: theme.textDim, fontStyle: 'italic'}}>Four commands. That's it.</p>
          <div className={styles.themeInstallGrid}>
            {['git clone ... && cd golems', 'bun install', 'golems wizard', 'golems status'].map((cmd, i) => (
              <div key={i} className={styles.themeInstallStep} style={{background: theme.cardBg, borderColor: theme.cardBorder}}>
                <div className={styles.themeStepNum} style={{background: theme.btnGradient, color: theme.btnText}}>{i + 1}</div>
                <code style={{color: theme.highlight, fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace"}}>{cmd}</code>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Golems grid */}
      <section className={styles.themeSection} style={{background: theme.bgGradient, borderTopColor: `${theme.accent}20`}}>
        <div className={styles.themeSectionInner}>
          <h2 style={{color: theme.text}}>Meet the Golems</h2>
          <p style={{color: theme.textDim, fontStyle: 'italic'}}>Each golem owns a domain, not an I/O channel</p>
          <div className={styles.themeGolemGrid}>
            {golems.map((g) => (
              <div key={g.name} className={styles.themeGolemCard} style={{background: theme.cardBg, borderColor: theme.cardBorder}}>
                <div style={{display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem'}}>
                  <span style={{fontSize: '1.4rem'}}>{g.emoji}</span>
                  <span style={{fontWeight: 700, color: theme.text, fontSize: '0.95rem'}}>{g.name}</span>
                </div>
                <p style={{color: theme.textMuted, fontSize: '0.85rem', margin: 0, lineHeight: 1.5}}>{g.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Hub: Theme picker
   ══════════════════════════════════════════════════════════════ */

function ThemeHub({onSelect}: {onSelect: (id: string) => void}) {
  return (
    <div className={styles.hub}>
      <div className={styles.hubHeader}>
        <GolemsLogo className={styles.hubLogo} />
        <h1 className={styles.hubTitle}>Color Themes</h1>
        <p className={styles.hubSubtitle}>Same layout. Different palettes. Pick your vibe.</p>
      </div>
      <div className={styles.hubGrid}>
        {themes.map((t) => (
          <button
            key={t.id}
            className={styles.hubCard}
            onClick={() => onSelect(t.id)}
            type="button"
            style={{'--swatch': t.swatch, '--bg': t.bg, '--text': t.text, '--accent': t.accent} as React.CSSProperties}
          >
            <div className={styles.hubSwatch} style={{background: t.swatch}} />
            <div className={styles.hubCardContent}>
              <h3 style={{color: t.text}}>{t.name}</h3>
              <p style={{color: t.textDim}}>{t.desc}</p>
            </div>
            <div className={styles.hubPreview} style={{background: t.bg}}>
              <div className={styles.hubPreviewBar} style={{background: t.accent, opacity: 0.6}} />
              <div className={styles.hubPreviewLines}>
                <div style={{background: t.textMuted, opacity: 0.3, height: 3, width: '60%', borderRadius: 2}} />
                <div style={{background: t.textMuted, opacity: 0.2, height: 3, width: '80%', borderRadius: 2}} />
                <div style={{background: t.textMuted, opacity: 0.15, height: 3, width: '45%', borderRadius: 2}} />
              </div>
            </div>
          </button>
        ))}
      </div>
      <div className={styles.hubFooter}>
        <Link to="/" className={styles.hubBackLink}>&larr; Back to homepage</Link>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════
   Page
   ══════════════════════════════════════════════════════════════ */

export default function ThemesPage() {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);

  const handleBack = useCallback(() => setActiveTheme(null), []);

  const selectedTheme = themes.find((t) => t.id === activeTheme);

  if (selectedTheme) {
    return (
      <Layout title={`${selectedTheme.name} Theme`} description={`Golems in ${selectedTheme.name} palette`}>
        <ThemedHomepage theme={selectedTheme} onBack={handleBack} />
      </Layout>
    );
  }

  return (
    <Layout title="Color Themes" description="5 color palette variations for Golems">
      <ThemeHub onSelect={setActiveTheme} />
    </Layout>
  );
}

import {useState, useEffect} from 'react';
import styles from './GolemMascot.module.css';

export type MascotVariant = 'guardian' | 'prague' | 'neon' | 'pixel' | 'ink';

// 5 dramatically different mascot designs
const VARIANTS: Record<MascotVariant, string[]> = {
  // Clay Guardian — ancient, heavy, cracked stone with glowing truth
  guardian: [
    '         ▄▄████████▄▄',
    '       ▄██▓░░░░░░░░▓██▄',
    '     ▄██▓░░┌──────┐░░▓██▄',
    '    ███▓░░░│ אמת  │░░░▓███',
    '   ███▓░░░░└──────┘░░░░▓███',
    '   ███▓░░░░░░░░░░░░░░░░▓███',
    '  ████▓░░■■■░░░░░░■■■░░▓████',
    '  ████▓░░■◆■░░░░░░■◆■░░▓████',
    '  ████▓░░■■■░░░░░░■■■░░▓████',
    '   ███▓░░░░░░░░░░░░░░░░▓███',
    '   ███▓░░░░╔══════╗░░░░▓███',
    '   ███▓░░░░║ {··} ║░░░░▓███',
    '    ███▓░░░╚══════╝░░░▓███',
    '     ▀██▓░░░░░░░░░░░░▓██▀',
    '    ╔══▀████████████████▀══╗',
    '    ║                      ║',
  ],
  // Prague Protector — gothic arches, ornate, synagogue silhouette
  prague: [
    '            ╱╲',
    '           ╱  ╲',
    '          ╱ ✡  ╲',
    '         ╱══════╲',
    '        ┃████████┃',
    '     ╔══╣ אמת   ╠══╗',
    '     ║  ┃────────┃  ║',
    '     ║  ┃ ◉    ◉ ┃  ║',
    '     ║  ┃        ┃  ║',
    '     ║  ┃ ╔════╗ ┃  ║',
    '     ║  ┃ ║{··}║ ┃  ║',
    '     ║  ┃ ╚════╝ ┃  ║',
    '     ╠══╣████████╠══╣',
    '     ║  ┃████████┃  ║',
    '     ╚══╩════════╩══╝',
    '       ╱╲        ╱╲',
  ],
  // Neon Shem — modern, minimal, geometric circuit-board
  neon: [
    '    ┌─────────────────────┐',
    '    │ ╭───╮   ╭───╮       │',
    '    │ │ ◈ │───│ ◈ │       │',
    '    │ ╰───╯   ╰───╯       │',
    '    │                     │',
    '    │    ╭─── אמת ───╮    │',
    '    │    │             │    │',
    '    │    ╰─── {·} ───╯    │',
    '    │                     │',
    '    │  ─── ─── ─── ───  │',
    '    │  ◈       ◈       ◈  │',
    '    └──┬──────────────┬──┘',
    '       │              │',
    '    ───┘              └───',
  ],
  // Pixel Golem — 8-bit retro, chunky blocks
  pixel: [
    '  ░░██████████████████░░',
    '  ░█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█░',
    '  █▓▓╔═══════════╗▓▓▓▓█',
    '  █▓▓║  א מ ת    ║▓▓▓▓█',
    '  █▓▓╚═══════════╝▓▓▓▓█',
    '  █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█',
    '  █▓▓██▓▓▓▓▓▓▓▓██▓▓▓▓█',
    '  █▓▓██▓▓▓▓▓▓▓▓██▓▓▓▓█',
    '  █▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█',
    '  █▓▓▓▓╔═══════╗▓▓▓▓▓▓█',
    '  █▓▓▓▓║ ░ ░ ░ ║▓▓▓▓▓▓█',
    '  █▓▓▓▓╚═══════╝▓▓▓▓▓▓█',
    '  ░█▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓█░',
    '  ░░████████████████████░░',
    '    ██              ██',
    '  ████              ████',
  ],
  // Ink Golem — calligraphic, formed from Hebrew strokes
  ink: [
    '           ～～～～～',
    '        ～～       ～～',
    '      ～    א מ ת    ～',
    '     ～                ～',
    '    ～   ◎          ◎   ～',
    '    ～                  ～',
    '     ～   ～ ～ ～ ～   ～',
    '      ～   ﹛ · ﹜   ～',
    '       ～           ～',
    '        ～～     ～～',
    '       ╱   ～～～   ╲',
    '      ╱               ╲',
    '     ╱                 ╲',
  ],
};

const VARIANT_COLORS: Record<MascotVariant, { clay: string; accent: string; glow: string; bg: string }> = {
  guardian: { clay: '#c4783c', accent: '#8b7355', glow: '#ffb020', bg: '#1a1510' },
  prague:   { clay: '#d4a040', accent: '#6e5c3a', glow: '#f0c050', bg: '#15120d' },
  neon:     { clay: '#40d4d4', accent: '#2088aa', glow: '#00ffcc', bg: '#0a1218' },
  pixel:    { clay: '#50c878', accent: '#2a8040', glow: '#80ff80', bg: '#0a140a' },
  ink:      { clay: '#a090c0', accent: '#6050a0', glow: '#c0b0ff', bg: '#12101a' },
};

interface GolemMascotProps {
  variant?: MascotVariant;
  size?: 'sm' | 'md' | 'lg';
  animated?: boolean;
  className?: string;
}

function colorLine(line: string, colors: { clay: string; accent: string; glow: string }): JSX.Element[] {
  const parts: JSX.Element[] = [];
  let key = 0;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ('אמת✡'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.glow, textShadow: `0 0 10px ${colors.glow}60` }}>{ch}</span>);
    } else if ('◈◆◉◎'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.glow, textShadow: `0 0 6px ${colors.glow}40` }}>{ch}</span>);
    } else if ('╔╗╚╝║╠╣═╭╮╰╯╱╲┃┌┐└┘─│'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.accent }}>{ch}</span>);
    } else if ('▒▓█▄▀░■'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.clay, opacity: 0.8 }}>{ch}</span>);
    } else if ('～'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.clay, opacity: 0.6 }}>{ch}</span>);
    } else {
      parts.push(<span key={key++} style={{ color: '#777' }}>{ch}</span>);
    }
  }

  return parts;
}

export default function GolemMascot({ variant = 'guardian', size = 'md', animated = true, className }: GolemMascotProps) {
  const [visible, setVisible] = useState(!animated);
  const lines = VARIANTS[variant] || VARIANTS.guardian;
  const colors = VARIANT_COLORS[variant] || VARIANT_COLORS.guardian;

  useEffect(() => {
    if (animated) {
      const timer = setTimeout(() => setVisible(true), 100);
      return () => clearTimeout(timer);
    }
  }, [animated]);

  const sizeClass = size === 'sm' ? styles.sm : size === 'lg' ? styles.lg : styles.md;

  return (
    <pre className={`${styles.mascot} ${sizeClass} ${visible ? styles.visible : ''} ${className || ''}`}>
      {lines.map((line, i) => (
        <div
          key={i}
          className={animated ? styles.line : styles.lineStatic}
          style={animated ? { animationDelay: `${i * 60}ms` } : undefined}
        >
          {colorLine(line, colors)}
        </div>
      ))}
    </pre>
  );
}

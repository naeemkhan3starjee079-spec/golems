import {useState, useEffect} from 'react';
import styles from './GolemMascot.module.css';

export type MascotVariant = 'circuit' | 'clay' | 'dense' | 'weathered' | 'hybrid';

// Pre-rendered ASCII art lines for each variant
// Stripped of neofetch color codes, colored via CSS spans
const VARIANTS: Record<MascotVariant, string[]> = {
  circuit: [
    '   ┌──◇──────────────◇──┐',
    '   │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│',
    '◇──┤▒▒┌──────────────┐▒▒├──◇',
    '   │▒▒│  א   מ   ת  │▒▒│',
    '◇──┤▒▒└──────────────┘▒▒├──◇',
    '   │▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒│',
    '   │▒▒┌────┐▒▒┌────┐▒▒│',
    '   │▒▒│█▓▓█│▒▒│█▓▓█│▒▒│',
    '◇──┤▒▒│█▓▓█│▒▒│█▓▓█│▒▒├──◇',
    '   │▒▒└────┘▒▒└────┘▒▒│',
    '   │▒▒▒▒◇──◇──◇──◇▒▒▒▒│',
    '   │▒▒▒▒▒┌────────┐▒▒▒▒│',
    '   │▒▒▒▒▒│ {···}  │▒▒▒▒│',
    '   │▒▒▒▒▒└────────┘▒▒▒▒│',
    '   └──◇────────╤───────◇──┘',
    ' ◇──◇          │          ◇──◇',
  ],
  clay: [
    '    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
    '  ▄█▓██████████████████████▓█▄',
    '  █▓█┌──────────────┐██████▓█',
    '  █▓█│  א   מ   ת  │██████▓█',
    '  █▓█└──────────────┘██████▓█',
    '  █▓▓██████████████████████▓█',
    '  █▓┌────┐████████┌────┐█▓█',
    '  █▓│█▓▓█│████████│█▓▓█│█▓█',
    '▀▀█▓│█▓▓█│████████│█▓▓█│█▓█▀▀',
    '  █▓└────┘████████└────┘█▓█',
    '  █▓████████████████████████▓█',
    '  █▓████┌──────────┐████████▓█',
    '  █▓████│ {·····}  │████████▓█',
    '  █▓████└──────────┘████████▓█',
    '  ▀█▓██████████████████████▓█▀',
    '    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
  ],
  dense: [
    '   ╔══◇══════════════════◇══╗',
    '   ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║',
    '◇══╣▓▓┌──────────────┐▓▓▓▓▓▓╠══◇',
    '   ║▓▓│  א   מ   ת  │▓▓▓▓▓▓║',
    '◇══╣▓▓└──────────────┘▓▓▓▓▓▓╠══◇',
    '   ║▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓║',
    '   ║▓▓┌────┐▓▓▓▓┌────┐▓▓║',
    '   ║▓▓│█▓▓█│▓▓▓▓│█▓▓█│▓▓║',
    '◇══╣▓▓│█▓▓█│▓▓▓▓│█▓▓█│▓▓╠══◇',
    '   ║▓▓└────┘▓▓▓▓└────┘▓▓║',
    '   ║▓▓▓▓◇──◇──◇──◇▓▓▓▓▓▓║',
    '   ║▓▓▓▓┌──────────┐▓▓▓▓▓▓║',
    '   ║▓▓▓▓│ {·····}  │▓▓▓▓▓▓║',
    '   ║▓▓▓▓└──────────┘▓▓▓▓▓▓║',
    '   ╚══◇══════════╤═════════◇══╝',
    ' ◇══◇            │            ◇══◇',
  ],
  weathered: [
    '    ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄',
    '  ▄█████████████████████████████▄',
    '  █████╔══════════════╗████████',
    '  █████║  א   מ   ת  ║████████',
    '  █████╚══════════════╝████████',
    '  ███████████████████████████████',
    ' █████╔════╗██████████╔════╗████',
    ' █████║█▓▓█║██████████║█▓▓█║████',
    '══████║█▓▓█║██████████║█▓▓█║████══',
    ' █████╚════╝██████████╚════╝████',
    '  ███████████████████████████████',
    '  ████████┌──────────┐█████████',
    '  ████████│ {·····}  │█████████',
    '  ████████└──────────┘█████████',
    '  ▀█████████████████████████████▀',
    '    ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀',
  ],
  hybrid: [
    '   ╔══◇══════════════════◇══╗',
    ' ▄▄║▓▓████████████████████▓▓║▄▄',
    '◇══╣▓▓┌──────────────┐▓▓▓▓▓▓╠══◇',
    '   ║▓▓│  א   מ   ת  │▓▓▓▓▓▓║',
    '◇══╣▓▓└──────────────┘▓▓▓▓▓▓╠══◇',
    '   ║▓▓████████████████████▓▓║',
    '   ║▓▓┌────┐▓▓▓▓┌────┐▓▓║',
    '   ║▓▓│█▓▓█│▓▓▓▓│█▓▓█│▓▓║',
    '◇══╣▓▓│█▓▓█│▓▓▓▓│█▓▓█│▓▓╠══◇',
    '   ║▓▓└────┘▓▓▓▓└────┘▓▓║',
    '   ║▓▓▓▓▓▓┌────────┐▓▓▓▓▓▓║',
    '   ║▓▓▓▓▓▓│ {···}  │▓▓▓▓▓▓║',
    '   ║▓▓▓▓▓▓└────────┘▓▓▓▓▓▓║',
    '   ║▓▓████████████████████▓▓║',
    ' ▀▀╚══◇══════════╤═════════◇══╝▀▀',
    ' ◇══◇            │            ◇══◇',
  ],
};

const VARIANT_COLORS: Record<MascotVariant, { clay: string; accent: string; glow: string }> = {
  circuit: { clay: '#d4a040', accent: '#5555ff', glow: '#e59500' },
  clay: { clay: '#c4783c', accent: '#e59500', glow: '#d4a040' },
  dense: { clay: '#d4a040', accent: '#5555ff', glow: '#40d4d4' },
  weathered: { clay: '#8b7355', accent: '#c4783c', glow: '#d4a040' },
  hybrid: { clay: '#d4a040', accent: '#5555ff', glow: '#e59500' },
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

  // Simple coloring: Hebrew letters get glow, structural chars get accent, rest gets clay
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if ('אמת'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.glow, textShadow: `0 0 8px ${colors.glow}40` }}>{ch}</span>);
    } else if ('◇╔╗╚╝║╠╣═'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.accent }}>{ch}</span>);
    } else if ('▒▓█▄▀'.includes(ch)) {
      parts.push(<span key={key++} style={{ color: colors.clay }}>{ch}</span>);
    } else {
      parts.push(<span key={key++} style={{ color: '#888' }}>{ch}</span>);
    }
  }

  return parts;
}

export default function GolemMascot({ variant = 'circuit', size = 'md', animated = true, className }: GolemMascotProps) {
  const [visible, setVisible] = useState(!animated);
  const lines = VARIANTS[variant] || VARIANTS.circuit;
  const colors = VARIANT_COLORS[variant] || VARIANT_COLORS.circuit;

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

import {useState, useEffect, useCallback} from 'react';
import type {ReactNode} from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import GolemsLogo from '@site/static/img/golems-logo.svg';
import TerminalHero from '@site/src/components/TerminalHero';
import TelegramMock from '@site/src/components/TelegramMock';

import styles from './index.module.css';

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

function HomepageHero() {
  const {siteConfig} = useDocusaurusContext();
  const [activeTab, setActiveTab] = useState(0);

  // Auto-cycle through tabs
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTab((prev) => (prev + 1) % 5);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Bidirectional sync — clicking either component updates both
  const handleTabChange = useCallback((index: number) => {
    setActiveTab(index);
  }, []);

  // Dynamic 3rd button based on active golem
  const activeGolem = golems[activeTab % golems.length];

  return (
    <header className={styles.heroBanner}>
      <div className={`container ${styles.heroInner}`}>
        <div className={styles.heroContent}>
          <GolemsLogo className={styles.heroLogo} />
          <h1 className={styles.heroTitle}>{siteConfig.title}</h1>
          <p className={styles.heroSubtitle}>Autonomous AI Agent Ecosystem</p>
          <div className={styles.heroTagline}>
            <span>Spawn</span>
            <span className={styles.heroTaglineArrow}>&rarr;</span>
            <span>Work</span>
            <span className={styles.heroTaglineArrow}>&rarr;</span>
            <span>Die</span>
            <span className={styles.heroTaglineArrow}>&rarr;</span>
            <span className={styles.heroTaglineHighlight}>Remember</span>
          </div>
          <div className={styles.buttons}>
            <Link className={styles.primaryButton} to="/docs/getting-started">
              Get Started
            </Link>
            <Link className={styles.secondaryButton} to="/docs/architecture">
              Architecture
            </Link>
            <Link className={styles.golemButton} to={activeGolem.link}>
              {activeGolem.emoji} {activeGolem.name} &rarr;
            </Link>
          </div>
        </div>
        <div className={styles.heroShowcase}>
          <TerminalHero activeIndex={activeTab} onTabClick={handleTabChange} />
          <TelegramMock activeIndex={activeTab} onTopicClick={handleTabChange} />
        </div>
      </div>
    </header>
  );
}

function GolemsSection() {
  return (
    <section className={styles.golemsSection}>
      <div className="container">
        <h2 className={styles.sectionTitle}>Meet the Golems</h2>
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

function ArchitectureSection() {
  return (
    <section className={styles.archSection}>
      <div className="container">
        <h2 className={styles.sectionTitle}>How It Works</h2>
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
              <li>Soltome Learner</li>
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

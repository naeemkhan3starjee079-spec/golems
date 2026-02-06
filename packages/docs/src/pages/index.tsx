import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            Get Started
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title="Home"
      description="Autonomous AI agent ecosystem for Claude Code">
      <HomepageHeader />
      <main>
        <section style={{padding: '2rem 0'}}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <Heading as="h3">Domain Expert Golems</Heading>
                <p>RecruiterGolem, EmailGolem, TellerGolem, ClaudeGolem — each owns a domain, not an I/O channel.</p>
              </div>
              <div className="col col--4">
                <Heading as="h3">Cloud + Local Split</Heading>
                <p>Railway runs background polling (email, jobs, briefing). Mac handles interactive Claude sessions and Telegram.</p>
              </div>
              <div className="col col--4">
                <Heading as="h3">Env-Gated Rollback</Heading>
                <p>Flip 3 environment variables to switch between cloud and local. Every change is reversible.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Golems',
  tagline: 'Autonomous AI agent ecosystem for Claude Code',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  markdown: {
    mermaid: true,
  },
  themes: ['@docusaurus/theme-mermaid'],

  url: 'https://etanhey.github.io',
  baseUrl: '/golems/',

  organizationName: 'EtanHey',
  projectName: 'golems',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/EtanHey/golems/tree/master/packages/docs/',
        },
        blog: false, // disable blog
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/golems-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: false,
    },
    navbar: {
      title: 'Golems',
      logo: {
        alt: 'Golems Logo',
        src: 'img/golems-logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'mainSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/docs/journey',
          label: 'Journey',
          position: 'left',
        },
        {
          to: '/docs/llm',
          label: 'For LLMs',
          position: 'left',
        },
        {
          href: 'https://etanheyman.com',
          label: 'etanheyman.com',
          position: 'right',
        },
        {
          href: 'https://github.com/EtanHey/golems',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Architecture', to: '/docs/architecture' },
            { label: 'Configuration', to: '/docs/configuration/env-vars' },
          ],
        },
        {
          title: 'Golems',
          items: [
            { label: 'RecruiterGolem', to: '/docs/golems/recruiter' },
            { label: 'EmailGolem', to: '/docs/golems/email' },
            { label: 'ClaudeGolem', to: '/docs/golems/claude' },
          ],
        },
        {
          title: 'More',
          items: [
            { label: 'GitHub', href: 'https://github.com/EtanHey/golems' },
            { label: 'Journey', to: '/docs/journey' },
            { label: 'etanheyman.com', href: 'https://etanheyman.com' },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} Golems. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json', 'sql', 'typescript'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

import {useState, useEffect} from 'react';
import styles from './TelegramMock.module.css';

interface TelegramMessage {
  sender: string;
  emoji: string;
  text: string;
  time: string;
  isBot?: boolean;
}

interface TopicScene {
  topic: string;
  topicEmoji: string;
  messages: TelegramMessage[];
}

const topicScenes: TopicScene[] = [
  {
    topic: 'General',
    topicEmoji: '\uD83D\uDCAC',
    messages: [
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Night Shift complete. 3 PRs created, all tests green.', time: '4:02', isBot: true},
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Morning briefing ready. 2 urgent emails, 1 job match.', time: '8:00', isBot: true},
    ],
  },
  {
    topic: 'Email',
    topicEmoji: '\uD83D\uDCE7',
    messages: [
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: '3 urgent emails detected. Stripe payment failed for Vercel.', time: '09:15', isBot: true},
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: 'Follow-up due: interview prep @ Acme (tomorrow)', time: '09:15', isBot: true},
    ],
  },
  {
    topic: 'Recruitment',
    topicEmoji: '\uD83D\uDCBC',
    messages: [
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'New reply from Sarah @ TechCorp: "Let\'s schedule a call"', time: '10:30', isBot: true},
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'Practice available: System Design or Behavioral?', time: '10:31', isBot: true},
    ],
  },
  {
    topic: 'Finance',
    topicEmoji: '\uD83D\uDCB0',
    messages: [
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: '\u26A0\uFE0F Payment failed: Vercel Pro ($20/mo). Card expired.', time: '11:00', isBot: true},
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: 'Feb total: $847.20 across 14 subscriptions. Software leading.', time: '11:00', isBot: true},
    ],
  },
  {
    topic: 'Jobs',
    topicEmoji: '\uD83C\uDFAF',
    messages: [
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Hot match: Senior Engineer @ Acme (9.2/10)', time: '06:15', isBot: true},
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Auto-outreach sent. 3 new matches today.', time: '06:15', isBot: true},
    ],
  },
];

interface TelegramMockProps {
  activeIndex: number;
}

export default function TelegramMock({activeIndex}: TelegramMockProps) {
  const scene = topicScenes[activeIndex % topicScenes.length];

  return (
    <div className={styles.telegram}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.avatar}>G</div>
          <div>
            <div className={styles.groupName}>Golems</div>
            <div className={styles.memberCount}>5 golems online</div>
          </div>
        </div>
      </div>

      {/* Topic indicator */}
      <div className={styles.topicBar}>
        <span className={styles.topicEmoji}>{scene.topicEmoji}</span>
        <span className={styles.topicName}>{scene.topic}</span>
      </div>

      {/* Messages */}
      <div className={styles.messages}>
        {scene.messages.map((msg, i) => (
          <div
            key={`${activeIndex}-${i}`}
            className={styles.message}
            style={{animationDelay: `${i * 200}ms`}}
          >
            <div className={styles.msgHeader}>
              <span className={styles.msgEmoji}>{msg.emoji}</span>
              <span className={styles.msgSender}>{msg.sender}</span>
              <span className={styles.msgTime}>{msg.time}</span>
            </div>
            <div className={styles.msgText}>{msg.text}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className={styles.footer}>
        <span className={styles.seeAll}>See all topics \u2192</span>
      </div>
    </div>
  );
}

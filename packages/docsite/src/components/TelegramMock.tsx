import styles from './TelegramMock.module.css';

interface TelegramMessage {
  sender: string;
  emoji: string;
  text: string;
  time: string;
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
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Night Shift complete. 3 PRs created, all tests green.', time: '4:02'},
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Morning briefing ready. 2 urgent emails, 1 job match.', time: '8:00'},
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Zikaron indexed 847 new chunks from last 3 sessions.', time: '8:01'},
    ],
  },
  {
    topic: 'Email',
    topicEmoji: '\uD83D\uDCE7',
    messages: [
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: '3 urgent emails detected. Stripe payment failed for Vercel.', time: '09:15'},
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: 'Routed 2 emails to RecruiterGolem (interview prep).', time: '09:16'},
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: 'Follow-up due: interview prep @ Acme (tomorrow)', time: '09:16'},
    ],
  },
  {
    topic: 'Recruitment',
    topicEmoji: '\uD83D\uDCBC',
    messages: [
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'New reply from Sarah @ TechCorp: "Let\'s schedule a call"', time: '10:30'},
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'Practice available: System Design or Behavioral?', time: '10:31'},
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'Auto follow-up sent to 3 contacts (5-day check-in).', time: '10:32'},
    ],
  },
  {
    topic: 'Finance',
    topicEmoji: '\uD83D\uDCB0',
    messages: [
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: '\u26A0\uFE0F Payment failed: Vercel Pro ($20/mo). Card expired.', time: '11:00'},
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: 'Feb total: $847.20 across 14 subscriptions. Software leading.', time: '11:00'},
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: 'Tax categories assigned. 3 deductions flagged for review.', time: '11:01'},
    ],
  },
  {
    topic: 'Jobs',
    topicEmoji: '\uD83C\uDFAF',
    messages: [
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Hot match: Senior Engineer @ Acme (9.2/10)', time: '06:15'},
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Full Stack @ TechCorp (8.7/10) — React + Node.', time: '06:15'},
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Auto-outreach sent to top match. 3 new today.', time: '06:16'},
    ],
  },
];

interface TelegramMockProps {
  activeIndex: number;
  onTopicClick?: (index: number) => void;
}

export default function TelegramMock({activeIndex, onTopicClick}: TelegramMockProps) {
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

      {/* Topic tabs */}
      <div className={styles.topicTabs}>
        {topicScenes.map((t, i) => (
          <button
            key={t.topic}
            className={`${styles.topicTab} ${i === activeIndex % topicScenes.length ? styles.topicTabActive : ''}`}
            onClick={() => onTopicClick?.(i)}
            type="button"
          >
            <span>{t.topicEmoji}</span>
            <span>{t.topic}</span>
          </button>
        ))}
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

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
      {sender: 'Etan', emoji: '\uD83D\uDC64', text: 'hey, what did you get done while I was asleep?', time: '8:12'},
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Night Shift ran from 3-5am. Shipped 2 PRs on songscript, fixed that flaky test. All green.', time: '8:12'},
      {sender: 'ClaudeGolem', emoji: '\uD83E\uDD16', text: 'Also: 1 urgent email from Stripe, and a 9.2 job match came in. Check the topics.', time: '8:13'},
    ],
  },
  {
    topic: 'Email',
    topicEmoji: '\uD83D\uDCE7',
    messages: [
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: 'Stripe payment failed for Vercel Pro — card on file expired. Needs action today.', time: '09:15'},
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: 'GitHub: 2 review requests on golems. Routed interview prep email to Recruiter.', time: '09:16'},
      {sender: 'EmailGolem', emoji: '\uD83D\uDCE7', text: 'Reminder: follow-up with Acme is due tomorrow. Draft ready if you want it.', time: '09:17'},
    ],
  },
  {
    topic: 'Recruitment',
    topicEmoji: '\uD83D\uDCBC',
    messages: [
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'Sarah @ TechCorp replied: "Let\'s schedule for Thursday." Want me to confirm?', time: '10:30'},
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'Your Elo is 1847 now. Ready for a system design round? You\'ve been crushing it.', time: '10:31'},
      {sender: 'RecruiterGolem', emoji: '\uD83D\uDCBC', text: 'Sent check-ins to 3 contacts who went quiet. Keeping the pipeline warm.', time: '10:32'},
    ],
  },
  {
    topic: 'Finance',
    topicEmoji: '\uD83D\uDCB0',
    messages: [
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: '\u26A0\uFE0F Heads up: Vercel charge bounced. Update the card before they suspend.', time: '11:00'},
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: 'Feb so far: $847 across 14 subs. Software is 62% of spend.', time: '11:01'},
      {sender: 'TellerGolem', emoji: '\uD83D\uDCB0', text: 'Flagged 3 tax deductions from this week. Review when you get a chance.', time: '11:02'},
    ],
  },
  {
    topic: 'Jobs',
    topicEmoji: '\uD83C\uDFAF',
    messages: [
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Strong match: Senior Engineer @ Acme — 9.2/10. Stack is exactly your thing.', time: '06:15'},
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Also found: Full Stack @ TechCorp (8.7) — React + Node, remote-first.', time: '06:16'},
      {sender: 'JobGolem', emoji: '\uD83C\uDFAF', text: 'Sent intro to the Acme recruiter. 3 new listings matched your profile today.', time: '06:17'},
    ],
  },
];

interface TelegramMockProps {
  activeIndex: number;
  onTopicClick?: (index: number) => void;
  accentColor?: string;
}

export default function TelegramMock({activeIndex, onTopicClick, accentColor}: TelegramMockProps) {
  const scene = topicScenes[activeIndex % topicScenes.length];

  return (
    <div className={styles.telegram} style={accentColor ? {'--tg-accent': accentColor} as React.CSSProperties : undefined}>
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
      <div className={styles.topicTabs} role="tablist" aria-label="Telegram topic tabs">
        {topicScenes.map((t, i) => (
          <button
            key={t.topic}
            className={`${styles.topicTab} ${i === activeIndex % topicScenes.length ? styles.topicTabActive : ''}`}
            onClick={() => onTopicClick?.(i)}
            type="button"
            role="tab"
            aria-selected={i === activeIndex % topicScenes.length}
            aria-label={`${t.topic} topic`}
          >
            <span aria-hidden="true">{t.topicEmoji}</span>
            <span>{t.topic}</span>
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className={styles.messages} role="tabpanel" aria-label={`${scene.topic} messages`}>
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

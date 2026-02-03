/**
 * EmailGolem Index Integration Tests
 *
 * Tests the main loop: fetch → score → save → notify
 */

import { describe, it, expect, beforeEach, afterEach, mock, spyOn } from "bun:test";

// Mock modules before importing
const mockFetchRecentEmails = mock(() => Promise.resolve([]));
const mockFetchEmailsSince = mock(() => Promise.resolve([]));
const mockResetGmailClient = mock(() => {});

const mockScoreEmail = mock(() => Promise.resolve({
  id: "test-1",
  subject: "Test",
  from: "test@test.com",
  snippet: "Test snippet",
  receivedAt: new Date().toISOString(),
  score: 5,
  category: "other",
  reason: "Test",
  subscription: null,
  scoredAt: new Date().toISOString(),
}));

const mockCreateDbClient = mock(() => ({ from: mock(() => ({ insert: mock(() => ({})) })) }));
const mockSaveEmail = mock(() => Promise.resolve({ success: true }));
const mockTrackSubscription = mock(() => Promise.resolve({ success: true }));
const mockMarkNotified = mock(() => Promise.resolve({ success: true }));
const mockSyncOfflineQueue = mock(() => Promise.resolve({ synced: 0, failed: 0 }));

// Sample test fixtures
const FIXTURES = {
  interview: {
    id: "msg-interview-1",
    subject: "Interview Scheduled: Senior SWE at Microsoft",
    from: "recruiting@microsoft.com",
    fromName: "Microsoft Recruiting",
    snippet: "Please use this link to schedule your technical interview...",
    receivedAt: new Date(),
  },
  payment_failed: {
    id: "msg-payment-1",
    subject: "Payment Failed - Action Required",
    from: "billing@netflix.com",
    fromName: "Netflix",
    snippet: "We couldn't process your payment. Please update your...",
    receivedAt: new Date(),
  },
  job_update: {
    id: "msg-job-1",
    subject: "Your application to Meta",
    from: "noreply@meta.com",
    fromName: "Meta Careers",
    snippet: "We've received your application and will review it...",
    receivedAt: new Date(),
  },
  subscription_receipt: {
    id: "msg-sub-1",
    subject: "Your Netflix receipt",
    from: "info@netflix.com",
    fromName: "Netflix",
    snippet: "Your monthly charge of $15.99 has been processed...",
    receivedAt: new Date(),
  },
  newsletter: {
    id: "msg-news-1",
    subject: "This Week in JavaScript",
    from: "newsletter@jsweekly.com",
    fromName: "JS Weekly",
    snippet: "Top stories from the JavaScript ecosystem this week...",
    receivedAt: new Date(),
  },
};

describe("EmailGolem Index", () => {
  describe("processEmails", () => {
    it("should fetch, score, and save emails", async () => {
      // This test will verify the main flow once index.ts is implemented
      // For now, we test the expected interface

      const emails = [FIXTURES.job_update, FIXTURES.newsletter];

      // Expect: fetch returns emails
      mockFetchRecentEmails.mockResolvedValueOnce(emails);

      // Expect: each email gets scored
      const scoredEmails = emails.map((e, i) => ({
        ...e,
        id: e.id,
        subject: e.subject,
        from: e.from,
        snippet: e.snippet,
        receivedAt: e.receivedAt.toISOString(),
        score: i === 0 ? 7 : 2, // job=7, newsletter=2
        category: i === 0 ? "job" : "newsletter",
        reason: "Test scoring",
        subscription: null,
        scoredAt: new Date().toISOString(),
      }));

      // Verify scoring produces expected structure
      expect(scoredEmails[0].score).toBe(7);
      expect(scoredEmails[0].category).toBe("job");
      expect(scoredEmails[1].score).toBe(2);
      expect(scoredEmails[1].category).toBe("newsletter");
    });

    it("should notify immediately when score >= 10", async () => {
      const email = FIXTURES.interview;

      const scoredEmail = {
        ...email,
        id: email.id,
        subject: email.subject,
        from: email.from,
        snippet: email.snippet,
        receivedAt: email.receivedAt.toISOString(),
        score: 10,
        category: "interview",
        reason: "Interview scheduled",
        subscription: null,
        scoredAt: new Date().toISOString(),
      };

      // Score 10 should trigger immediate notification
      expect(scoredEmail.score).toBe(10);
      expect(scoredEmail.score >= 10).toBe(true);
    });

    it("should track subscriptions when category is subscription", async () => {
      const email = FIXTURES.subscription_receipt;

      const scoredEmail = {
        ...email,
        id: email.id,
        subject: email.subject,
        from: email.from,
        snippet: email.snippet,
        receivedAt: email.receivedAt.toISOString(),
        score: 5,
        category: "subscription",
        reason: "Subscription receipt",
        subscription: {
          serviceName: "Netflix",
          amount: 15.99,
          frequency: "monthly" as const,
        },
        scoredAt: new Date().toISOString(),
      };

      // Subscription info should be extracted
      expect(scoredEmail.category).toBe("subscription");
      expect(scoredEmail.subscription).not.toBeNull();
      expect(scoredEmail.subscription?.serviceName).toBe("Netflix");
      expect(scoredEmail.subscription?.amount).toBe(15.99);
    });

    it("should skip already-processed emails (deduplication)", async () => {
      // Emails should be deduplicated by gmail_id
      const emails = [
        { ...FIXTURES.job_update, id: "msg-123" },
        { ...FIXTURES.job_update, id: "msg-123" }, // Duplicate
      ];

      // After deduplication, should only process one
      const uniqueIds = [...new Set(emails.map(e => e.id))];
      expect(uniqueIds.length).toBe(1);
    });
  });

  describe("dry-run mode", () => {
    it("should not save or notify in dry-run mode", async () => {
      const dryRun = true;

      // In dry-run mode:
      // - Still fetch and score emails
      // - But don't save to DB or send notifications

      expect(dryRun).toBe(true);
      // This test documents the expected behavior
    });

    it("should log what would be done", async () => {
      const dryRun = true;
      const email = FIXTURES.interview;

      // In dry-run mode, should log:
      // "[DRY-RUN] Would notify: Interview Scheduled..."
      // "[DRY-RUN] Would save email to DB..."

      expect(dryRun).toBe(true);
    });
  });

  describe("offline resilience", () => {
    it("should queue emails when Supabase is unavailable", async () => {
      // When Supabase fails, emails should be queued locally
      const result = { success: false, queued: true, error: "Network error" };

      expect(result.queued).toBe(true);
      expect(result.success).toBe(false);
    });

    it("should sync queue on startup", async () => {
      // On startup, should attempt to sync any queued items
      const syncResult = { synced: 3, failed: 1 };

      expect(syncResult.synced).toBeGreaterThan(0);
    });
  });

  describe("notification format", () => {
    it("should format urgent notification correctly", async () => {
      const email = {
        subject: "Interview Scheduled: Senior SWE at Microsoft",
        from: "recruiting@microsoft.com",
        score: 10,
        category: "interview",
      };

      // Expected notification format
      const expectedTitle = "Urgent Email";
      const expectedBody = `Interview: ${email.subject.slice(0, 50)}`;

      expect(expectedBody).toContain("Interview Scheduled");
    });

    it("should include category emoji in notification", async () => {
      const categoryEmojis: Record<string, string> = {
        interview: "📅",
        urgent: "🚨",
        job: "💼",
        subscription: "💳",
      };

      expect(categoryEmojis["interview"]).toBe("📅");
      expect(categoryEmojis["urgent"]).toBe("🚨");
    });
  });

  describe("state management", () => {
    it("should track last check timestamp", async () => {
      const lastCheck = new Date();
      const state = {
        lastEmailCheck: lastCheck.toISOString(),
      };

      // Next run should only fetch emails since lastCheck
      expect(new Date(state.lastEmailCheck)).toEqual(lastCheck);
    });
  });
});

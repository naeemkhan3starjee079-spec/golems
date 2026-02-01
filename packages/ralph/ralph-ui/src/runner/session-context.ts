/**
 * Session Context Manager - Unified session context system
 * Part of MP-128: Replace scattered env/flag/config checks with single source of truth
 */

export interface NotificationConfig {
  enabled: boolean;
  topic?: string;
}

export interface SessionContextData {
  runner: 'ralph' | 'direct';
  model: string;
  interactive: boolean;
  notifications: NotificationConfig;
}

export interface SessionContextOptions {
  config?: {
    notifications?: {
      enabled?: boolean;
      topic?: string;
    };
  };
  flags?: {
    quiet?: boolean;
    notify?: boolean;
  };
}

export class SessionContext {
  public readonly runner: 'ralph' | 'direct';
  public readonly model: string;
  public readonly interactive: boolean;
  public readonly notifications: NotificationConfig;

  private constructor(data: SessionContextData) {
    this.runner = data.runner;
    this.model = data.model;
    this.interactive = data.interactive;
    this.notifications = data.notifications;
  }

  /**
   * Factory function to create SessionContext with unified config resolution
   */
  static create(options: SessionContextOptions = {}): SessionContext {
    const runner = detectRunner();
    const model = 'opus'; // Default model
    const interactive = runner === 'direct';
    const notifications = resolveNotifyConfig(options.config, options.flags);

    return new SessionContext({
      runner,
      model,
      interactive,
      notifications,
    });
  }
}

/**
 * Detect runner type based on environment
 */
function detectRunner(): 'ralph' | 'direct' {
  return process.env.RALPH_SESSION ? 'ralph' : 'direct';
}

/**
 * Resolve notification configuration from env + config + flags
 */
function resolveNotifyConfig(
  config?: { notifications?: { enabled?: boolean; topic?: string } },
  flags?: { quiet?: boolean; notify?: boolean }
): NotificationConfig {
  // Start with config defaults
  let enabled = config?.notifications?.enabled ?? false;
  const topic = config?.notifications?.topic;

  // Apply flags: --notify enables notifications
  if (flags?.notify) {
    enabled = true;
  }

  return {
    enabled,
    topic,
  };
}

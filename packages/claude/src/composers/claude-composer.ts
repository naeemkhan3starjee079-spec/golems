/**
 * ClaudeGolem Composer
 *
 * Core interactive chat handler, system commands (/start, /status, /admin, /trigger,
 * /morning, /fork, /setup, /tonight, /repos), forking, per-golem routing, and
 * the main message:text handler. Extracted from telegram-bot.ts.
 */

import { Composer, InlineKeyboard } from "grammy";
import { readFileSync } from "fs";
import { logEvent } from "@golems/shared/lib/event-log";
import { getSupabase } from "@golems/shared/lib/supabase-factory";
import { runJobSearch } from "@golems/jobs/index";
import {
  HOME,
  loadState,
  saveState,
  menuKeyboard,
  PERSONAS,
  activePersona,
  setActivePersona,
  pendingContentTopics,
  activeForkSessions,
  queue,
  isProcessing,
  processQueue,
  askClaude,
  askClaudeForked,
  askGolem,
  getGolemFromThreadId,
  checkRailwayHealth,
  getDailyStats,
  notify,
  shouldSuggestForking,
  extractTaskName,
  createForkSession,
} from "../lib/bot-shared";

export const claudeComposer = new Composer();

// /start command
claudeComposer.command("start", (ctx) => {
  const state = loadState();
  state.telegramChatId = ctx.chat.id;
  saveState(state);

  ctx.reply(`🤖 *ClaudeGolem v6*

*System*
/status — Health + stats
/golems — All golem statuses
/admin — Dashboard links

*Daily*
/plan — Today's schedule + tasks
/morning — Morning briefing
/spending — Monthly finances

*Jobs*
/jobs — Job matches
/practice — Interview practice
/outreach — Outreach pipeline

*Night Shift*
/tonight — Set tonight's target
/schedule — Weekly rotation
/trigger — Manual golem runs

Or just chat — I'll spawn Claude.`, {
    parse_mode: "Markdown",
    reply_markup: menuKeyboard
  });
});

// /status command
claudeComposer.command("status", async (ctx) => {
  const state = loadState();
  const queueLen = queue.length;
  const [railwayStatus, { emailStats, jobStats }] = await Promise.all([
    checkRailwayHealth(),
    getDailyStats(),
  ]);

  await ctx.reply(`📊 *Status*

🎯 Night Shift: \`${state.nightShiftTarget}\`
📬 Queue: ${queueLen} messages
⚙️ Processing: ${isProcessing ? "yes" : "idle"}
🚂 Railway: ${railwayStatus}
🧠 Bot: ${Math.round(process.uptime() / 60)}min uptime${emailStats}${jobStats}

[Dashboard](https://etanheyman.com/admin/golem) • /trigger email • /trigger jobs`, { parse_mode: "Markdown" });
});

// /admin command
claudeComposer.command("admin", (ctx) => {
  ctx.reply(`🖥️ *Admin Dashboard*

[Open Dashboard](https://etanheyman.com/admin/golem)

Pages: Overview • Jobs • Emails • Activity • Outreach • Night Shift • Content`, {
    parse_mode: "Markdown",
  });
});

// /trigger command - manual golem runs
claudeComposer.command("trigger", async (ctx) => {
  const arg = ctx.match?.trim().toLowerCase();
  if (!arg || !["email", "jobs", "briefing", "nightshift"].includes(arg)) {
    await ctx.reply(`⚡ *Trigger Golem Run*

Usage: \`/trigger <service>\`

Available:
• \`/trigger email\` — Run email check now
• \`/trigger jobs\` — Run job scrape now
• \`/trigger briefing\` — Send morning briefing
• \`/trigger nightshift\` — Run Night Shift now`, { parse_mode: "Markdown" });
    return;
  }

  await ctx.reply(`⚡ Triggering ${arg}...`);
  try {
    if (arg === "jobs") {
      const result = await runJobSearch();
      if (result) {
        await ctx.reply(`✅ Job scrape done: ${result.scraped} scraped, ${result.filtered} filtered, ${result.matched} matched`);
      } else {
        await ctx.reply("✅ Job scrape completed (no results object)");
      }
    } else if (arg === "email") {
      const { processEmails } = await import("@golems/shared/email/index");
      await processEmails();
      await ctx.reply("✅ Email check completed");
    } else if (arg === "briefing") {
      const { sendBriefing } = await import("@golems/services/briefing");
      await sendBriefing();
      await ctx.reply("✅ Briefing sent");
    } else if (arg === "nightshift") {
      await ctx.reply("🌙 Night Shift starting... This takes ~15min. I'll report back.");
      const { nightShift } = await import("@golems/services/night-shift");
      const heartbeat = setInterval(() => {
        ctx.replyWithChatAction("typing").catch(() => {});
      }, 60_000);
      let results;
      try {
        results = await nightShift();
      } finally {
        clearInterval(heartbeat);
      }
      const prs = results.filter(r => r.prUrl).map(r => r.prUrl).join("\n");
      const summary = results.map(r => `${r.success ? "✅" : "—"} ${r.repo}: ${r.improvement || "skipped"}`).join("\n");
      await ctx.reply(`🌙 *Night Shift Complete*\n\n${summary}${prs ? "\n\n" + prs : ""}`, { parse_mode: "Markdown" });
    }
  } catch (err) {
    await ctx.reply(`❌ Trigger failed: ${err instanceof Error ? err.message : String(err)}`);
  }
});

// /morning command
claudeComposer.command("morning", async (ctx) => {
  ctx.reply("☀️ Generating morning briefing...");
  try {
    const { sendBriefing } = await import("@golems/services/briefing");
    await sendBriefing();
  } catch (err) {
    ctx.reply(`❌ Briefing failed: ${err}`);
  }
});

// /fork command - create a dedicated session for a complex task
claudeComposer.command("fork", async (ctx) => {
  const taskPrompt = ctx.message?.text?.replace("/fork", "").trim();

  if (!taskPrompt) {
    await ctx.reply(`🔀 *Session Fork*

Fork a complex task into its own Claude session to keep the main chat clean.

*Usage:* \`/fork <task description>\`

*Examples:*
• \`/fork research React patterns in this codebase\`
• \`/fork analyze the database schema\`
• \`/fork build a new API endpoint\`

_Forked sessions run independently with their own memory._`, { parse_mode: "Markdown" });
    return;
  }

  const taskName = extractTaskName(taskPrompt);
  const forkMetadata = createForkSession(taskName, taskPrompt, ctx.chat.id);

  activeForkSessions.set(ctx.chat.id, forkMetadata);

  await ctx.reply(`🔀 *Forked Session Created*

📋 Task: ${taskName}
🆔 Session: \`${forkMetadata.sessionId.slice(0, 40)}...\`

_Starting work in forked session..._`, { parse_mode: "Markdown" });

  try {
    await ctx.replyWithChatAction("typing");

    console.log(`🔀 Spawning Claude fork for: "${taskPrompt.slice(0, 50)}..."`);
    await notify("🔀 Fork Started", `Task: ${taskName}`);

    const response = await askClaudeForked(forkMetadata.sessionId, taskPrompt, async () => {
      await ctx.replyWithChatAction("typing");
    });

    console.log(`✅ Claude fork completed (${response.length} chars)`);

    forkMetadata.completedAt = new Date().toISOString();
    forkMetadata.result = "Success";
    activeForkSessions.delete(ctx.chat.id);

    await notify("✅ Fork Done", taskName);

    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/gs) || [response];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }

    await ctx.reply(`✅ *Fork Complete*

Session: \`${forkMetadata.sessionId}\`

_You can continue this task by using \`/fork\` again with the same topic._`, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Fork error:", error);
    forkMetadata.completedAt = new Date().toISOString();
    forkMetadata.result = "Error";
    activeForkSessions.delete(ctx.chat.id);
    await ctx.reply("⚠️ Error in forked session.");
  }
});

// /setup command - configure group topics
claudeComposer.command("setup", async (ctx) => {
  const chatId = ctx.chat.id;
  const threadId = ctx.message?.message_thread_id;
  const chatType = ctx.chat.type;

  if (chatType !== "group" && chatType !== "supergroup") {
    await ctx.reply("⚠️ Run /setup in a group with Topics enabled, not in DM.");
    return;
  }

  const state = loadState();
  state.groupChatId = chatId;

  if (!state.topics) {
    state.topics = {};
  }

  const topicArg = ctx.message?.text?.split(" ")[1]?.toLowerCase();

  if (!topicArg) {
    await ctx.reply(`🔧 *Group Setup*

Two topics:
\`/setup alerts\` - in 🔔 Alerts topic

_General = ClaudeGolem interactive chat (no setup needed)_
_Alerts = all one-way notifications (jobs, email, nightshift, health)_

Current config:
• Group: ${state.groupChatId || "not set"}
• General: ClaudeGolem chat (auto)
• Alerts: ${state.topics?.alerts || "not set"}`, { parse_mode: "Markdown" });
    return;
  }

  const validTopics = ["alerts"];
  if (!validTopics.includes(topicArg)) {
    await ctx.reply(`❌ Unknown topic: ${topicArg}\nValid: alerts\n\n_General = interactive chat (auto), Alerts = all notifications_`, { parse_mode: "Markdown" });
    return;
  }

  if (!threadId) {
    await ctx.reply(`⚠️ No thread ID detected. Make sure Topics are enabled in this group and you're in a topic (not General).`);
    return;
  }

  (state.topics as any)[topicArg] = threadId;
  saveState(state);

  await ctx.reply(`✅ Registered **${topicArg}** topic (thread ${threadId})`, { parse_mode: "Markdown" });
});

// /tonight command
claudeComposer.command("tonight", async (ctx) => {
  const state = loadState();
  const arg = ctx.message?.text?.split(" ")[1]?.toLowerCase();

  if (arg && state.rotation.includes(arg)) {
    state.nightShiftTarget = arg;
    saveState(state);
    await ctx.reply(`✅ Tonight: \`${arg}\``, { parse_mode: "Markdown" });
    return;
  }

  const keyboard = new InlineKeyboard();
  state.rotation.forEach(repo => {
    const current = repo === state.nightShiftTarget ? "✓ " : "";
    keyboard.text(`${current}${repo}`, `tonight:${repo}`);
  });

  await ctx.reply(
    `🌙 *Night Shift Target*\nCurrent: \`${state.nightShiftTarget}\`\n\nTap to change:`,
    { parse_mode: "Markdown", reply_markup: keyboard }
  );
});

// /schedule command - weekly Night Shift rotation
claudeComposer.command("schedule", async (ctx) => {
  const state = loadState();
  const arg = (ctx.match ?? "").trim();

  const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // Clear schedule
  if (arg === "clear") {
    delete state.weeklySchedule;
    saveState(state);
    await ctx.reply("✅ Weekly schedule cleared. Using auto-rotation.", { parse_mode: "Markdown" });
    return;
  }

  // Set schedule: /schedule sun=golems mon=songscript tue=brainlayer ...
  if (arg && arg.includes("=")) {
    if (!state.weeklySchedule) {
      state.weeklySchedule = {};
    }
    const assignments = arg.split(/\s+/);
    for (const a of assignments) {
      const [day, repo] = a.split("=");
      const dayLower = day.toLowerCase();
      const dayIdx = DAYS.findIndex(d => d.toLowerCase() === dayLower);
      if (dayIdx >= 0 && state.rotation.includes(repo)) {
        (state.weeklySchedule as Record<string, string>)[DAYS[dayIdx].toLowerCase()] = repo;
      }
    }
    saveState(state);

    // Show updated schedule
    let msg = `✅ *Schedule Updated*\n\n`;
    for (const day of DAYS) {
      const repo = (state.weeklySchedule as Record<string, string>)?.[day.toLowerCase()];
      msg += `${day}: ${repo ? `\`${repo}\`` : "_auto-rotate_"}\n`;
    }
    await ctx.reply(msg, { parse_mode: "Markdown" });
    return;
  }

  // Show current schedule
  let msg = `📅 *Night Shift Weekly Schedule*\n\n`;
  msg += `Current target: \`${state.nightShiftTarget}\`\n\n`;

  if (state.weeklySchedule && Object.keys(state.weeklySchedule).length > 0) {
    for (const day of DAYS) {
      const repo = (state.weeklySchedule as Record<string, string>)?.[day.toLowerCase()];
      const isToday = new Date().getDay() === DAYS.indexOf(day);
      const marker = isToday ? " 👈" : "";
      msg += `${day}: ${repo ? `\`${repo}\`` : "_auto_"}${marker}\n`;
    }
  } else {
    msg += `_No weekly schedule set — using auto-rotation._\n`;
    msg += `Current rotation: ${state.rotation.map(r => `\`${r}\``).join(" → ")}\n`;
  }

  msg += `\n*Set schedule:*\n\`/schedule sun=golems mon=songscript\`\n`;
  msg += `\n*Clear schedule:*\n\`/schedule clear\``;

  await ctx.reply(msg, { parse_mode: "Markdown" });
});

// /repos command
claudeComposer.command("repos", (ctx) => {
  const state = loadState();
  ctx.reply(`📁 ${state.rotation.map(r => `\`${r}\``).join(" • ")}`, { parse_mode: "Markdown" });
});

// ═══════════════════════════════════════════════════════
// Callback Query Handlers
// ═══════════════════════════════════════════════════════

// Tonight repo selection
claudeComposer.callbackQuery(/^tonight:/, async (ctx) => {
  const repo = ctx.callbackQuery.data?.replace("tonight:", "") || "";
  const state = loadState();

  if (state.rotation.includes(repo)) {
    state.nightShiftTarget = repo;
    saveState(state);

    await ctx.editMessageText(`🌙 Tonight: \`${repo}\``, { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery({ text: `Set to ${repo}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Unknown repo" });
  }
});

// Persona selection
claudeComposer.callbackQuery(/^persona:/, async (ctx) => {
  const personaKey = ctx.callbackQuery.data?.replace("persona:", "") || "default";
  if (PERSONAS[personaKey]) {
    setActivePersona(personaKey);
    const persona = PERSONAS[personaKey];
    await ctx.editMessageText(`🎭 Switched to: ${persona.emoji} *${persona.name}*`, { parse_mode: "Markdown" });
    await ctx.answerCallbackQuery({ text: `Now: ${persona.name}` });
  } else {
    await ctx.answerCallbackQuery({ text: "Unknown persona" });
  }
});

// Fork task callback - user accepted the fork suggestion
claudeComposer.callbackQuery(/^fork-task:/, async (ctx) => {
  const taskName = ctx.callbackQuery.data?.replace("fork-task:", "") || "task";
  const chatId = ctx.chat?.id;

  if (!chatId) {
    await ctx.answerCallbackQuery({ text: "Error: no chat ID" });
    return;
  }

  const pending = pendingContentTopics.get(chatId);
  if (!pending || !pending.type.startsWith("fork:")) {
    await ctx.answerCallbackQuery({ text: "Prompt not found" });
    await ctx.editMessageText("⚠️ Session expired. Please send your message again.");
    return;
  }

  const taskPrompt = pending.type.replace("fork:", "");
  pendingContentTopics.delete(chatId);

  const forkMetadata = createForkSession(taskName, taskPrompt, chatId);
  activeForkSessions.set(chatId, forkMetadata);

  await ctx.editMessageText(`🔀 *Forking Session...*

📋 Task: ${taskName.replace(/-/g, " ")}
🆔 Session: \`${forkMetadata.sessionId.slice(0, 40)}...\`

_Starting work..._`, { parse_mode: "Markdown" });
  await ctx.answerCallbackQuery({ text: "Forking..." });

  try {
    await ctx.replyWithChatAction("typing");

    console.log(`🔀 Spawning Claude fork for: "${taskPrompt.slice(0, 50)}..."`);
    await notify("🔀 Fork Started", `Task: ${taskName}`);

    const response = await askClaudeForked(forkMetadata.sessionId, taskPrompt, async () => {
      await ctx.replyWithChatAction("typing");
    });

    console.log(`✅ Claude fork completed (${response.length} chars)`);

    forkMetadata.completedAt = new Date().toISOString();
    forkMetadata.result = "Success";
    activeForkSessions.delete(chatId);

    await notify("✅ Fork Done", taskName);

    if (response.length > 4000) {
      const chunks = response.match(/.{1,4000}/gs) || [response];
      for (const chunk of chunks) {
        await ctx.reply(chunk);
      }
    } else {
      await ctx.reply(response);
    }

    await ctx.reply(`✅ *Fork Complete*

Session: \`${forkMetadata.sessionId}\``, { parse_mode: "Markdown" });

  } catch (error) {
    console.error("Fork error:", error);
    forkMetadata.completedAt = new Date().toISOString();
    forkMetadata.result = "Error";
    activeForkSessions.delete(chatId);
    await ctx.reply("⚠️ Error in forked session.");
  }
});

// Fork decline callback
claudeComposer.callbackQuery("fork-decline", async (ctx) => {
  const chatId = ctx.chat?.id;

  if (!chatId) {
    await ctx.answerCallbackQuery({ text: "Error: no chat ID" });
    return;
  }

  const pending = pendingContentTopics.get(chatId);
  if (!pending || !pending.type.startsWith("fork:")) {
    await ctx.answerCallbackQuery({ text: "Session expired" });
    await ctx.editMessageText("⚠️ Session expired. Please send your message again.");
    return;
  }

  const taskPrompt = pending.type.replace("fork:", "");
  pendingContentTopics.delete(chatId);

  await ctx.editMessageText("💬 *Using Main Chat*\n\n_Adding to queue..._", { parse_mode: "Markdown" });
  await ctx.answerCallbackQuery({ text: "Queued in main chat" });

  queue.push({ ctx, text: taskPrompt });
  console.log(`📥 Queued (declined fork): "${taskPrompt.slice(0, 50)}..."`);

  if (!isProcessing) {
    processQueue();
  } else if (queue.length > 1) {
    await ctx.reply(`⏳ Queued (${queue.length - 1} ahead)`);
  }
});

// Catch-all for unknown callbacks
claudeComposer.on("callback_query:data", async (ctx) => {
  console.log("Unknown callback:", ctx.callbackQuery.data);
  await ctx.answerCallbackQuery();
});

// ═══════════════════════════════════════════════════════
// Main Message Handler
// ═══════════════════════════════════════════════════════

claudeComposer.on("message:text", async (ctx) => {
  const text = ctx.message.text.trim();

  // Skip commands
  if (text.startsWith("/")) {
    return;
  }

  // Save chat ID
  const state = loadState();
  state.telegramChatId = ctx.chat.id;
  saveState(state);

  // Handle Reply Keyboard buttons
  if (text === "🌙 Tonight") {
    const keyboard = new InlineKeyboard();
    state.rotation.forEach(repo => {
      const current = repo === state.nightShiftTarget ? "✓ " : "";
      keyboard.text(`${current}${repo}`, `tonight:${repo}`);
    });
    await ctx.reply(
      `🌙 *Night Shift Target*\nCurrent: \`${state.nightShiftTarget}\`\n\nTap to change:`,
      { parse_mode: "Markdown", reply_markup: keyboard }
    );
    return;
  }

  if (text === "📊 Status") {
    const queueLen = queue.length;
    const [railwayStatus, { emailStats, jobStats }] = await Promise.all([
      checkRailwayHealth(),
      getDailyStats(),
    ]);

    await ctx.reply(`📊 *Status*

🎯 Night Shift: \`${state.nightShiftTarget}\`
📬 Queue: ${queueLen} messages
⚙️ Processing: ${isProcessing ? "yes" : "idle"}
🚂 Railway: ${railwayStatus}
🧠 Bot: ${Math.round(process.uptime() / 60)}min uptime${emailStats}${jobStats}

[Dashboard](https://etanheyman.com/admin/golem)`, { parse_mode: "Markdown" });
    return;
  }

  if (text === "📅 Queue") {
    try {
      const supabase = getSupabase();
      if (!supabase) { await ctx.reply("📅 Supabase not configured."); return; }

      const { data: events } = await supabase
        .from("golem_events")
        .select("actor, type, data, created_at")
        .order("created_at", { ascending: false })
        .limit(10);

      if (!events || events.length === 0) {
        await ctx.reply("📅 No recent activity. Golems are idle.");
        return;
      }

      let msg = "📅 *Recent Activity*\n\n";
      for (const ev of events) {
        const ago = Math.round((Date.now() - new Date(ev.created_at).getTime()) / 60000);
        const agoStr = ago < 60 ? `${ago}m` : `${Math.round(ago / 60)}h`;
        const icon = ev.actor === "emailgolem" ? "📧" : ev.actor === "jobgolem" ? "💼" : ev.actor === "nightshift" ? "🌙" : "🤖";
        msg += `${icon} \`${agoStr}\` ${ev.type.replace(/_/g, " ")}`;
        if (ev.data?.repo) msg += ` (${ev.data.repo})`;
        if (ev.data?.subject) msg += `: ${String(ev.data.subject).slice(0, 40)}`;
        msg += "\n";
      }

      msg += "\n[Full Activity](https://etanheyman.com/admin/golem/alerts)";
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch {
      await ctx.reply("📅 Could not load activity. Check /status for system health.");
    }
    return;
  }

  // Keyboard buttons — delegate to coach functions (mirrors /plan and /golems commands)
  if (text === "📋 Plan") {
    try {
      await ctx.replyWithChatAction("typing");
      const { planToday } = await import("@golems/coach/index");
      const { formatPlanForTelegram } = await import("@golems/coach/schedule-engine");
      const plan = await planToday();
      await ctx.reply(`📋 *Today's Plan*\n\n${formatPlanForTelegram(plan)}`, { parse_mode: "Markdown" });
    } catch (err) {
      await ctx.reply(`❌ Plan failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  if (text === "🤖 Golems") {
    try {
      await ctx.replyWithChatAction("typing");
      const { getEcosystemStatus } = await import("@golems/coach/status-aggregator");
      const status = await getEcosystemStatus();
      let msg = `🤖 *Golem Ecosystem*\n\nHealthy: ${status.healthy}/${status.golems.length}\n\n`;
      for (const golem of status.golems) {
        msg += `${golem.healthy ? "✅" : "❌"} *${golem.name}* — ${golem.summary}\n`;
      }
      await ctx.reply(msg, { parse_mode: "Markdown" });
    } catch (err) {
      await ctx.reply(`❌ Status failed: ${err instanceof Error ? err.message : String(err)}`);
    }
    return;
  }

  if (text === "🖥️ Admin") {
    const keyboard = new InlineKeyboard()
      .url("📊 Overview", "https://etanheyman.com/admin/golem")
      .row()
      .url("👔 Recruiter", "https://etanheyman.com/admin/golem/recruiter")
      .url("💰 Teller", "https://etanheyman.com/admin/golem/teller")
      .url("🔧 Monitor", "https://etanheyman.com/admin/golem/monitor")
      .row()
      .url("📧 Emails", "https://etanheyman.com/admin/golem/emails")
      .url("📋 Activity", "https://etanheyman.com/admin/golem/alerts")
      .url("🌙 Night Shift", "https://etanheyman.com/admin/golem/nightshift");
    await ctx.reply("🖥️ *Admin Dashboard*\n\nTap to open:", { parse_mode: "Markdown", reply_markup: keyboard });
    return;
  }

  // Per-golem topic routing
  const threadId = ctx.message?.message_thread_id;
  const golemConfig = getGolemFromThreadId(threadId, state);

  if (golemConfig) {
    console.log(`${golemConfig.icon} Routing to ${golemConfig.name} (thread ${threadId})`);
    await ctx.replyWithChatAction("typing");

    const response = await askGolem(golemConfig, text, async () => {
      await ctx.replyWithChatAction("typing");
    });

    logEvent("golem_telegram_chat", {
      golem: golemConfig.name,
      prompt: text.slice(0, 120),
      responseLength: response.length,
    }, golemConfig.name.toLowerCase() as any).catch(() => {});

    const prefix = `${golemConfig.icon} ${golemConfig.name}\n\n`;
    const fullResponse = prefix + response;

    const sendGolemReply = async (text: string) => {
      try {
        await ctx.reply(text, { message_thread_id: threadId, parse_mode: "Markdown" });
      } catch {
        await ctx.reply(text, { message_thread_id: threadId });
      }
    };

    if (fullResponse.length > 4000) {
      const chunks = fullResponse.match(/.{1,4000}/gs) || [fullResponse];
      for (const chunk of chunks) {
        await sendGolemReply(chunk);
      }
    } else {
      await sendGolemReply(fullResponse);
    }
    return;
  }

  // Auto-detect complex tasks and suggest forking
  if (shouldSuggestForking(text)) {
    const taskName = extractTaskName(text);
    const keyboard = new InlineKeyboard()
      .text("🔀 Fork It", `fork-task:${taskName}`)
      .text("💬 Main Chat", "fork-decline");

    await ctx.reply(`🔀 *Detected Complex Task*

This looks like a task that might benefit from its own session:
"${taskName.replace(/-/g, " ")}"

*Fork benefits:*
• Keeps main chat clean
• Independent memory for this task
• Can resume later

*Choose:*`, { parse_mode: "Markdown", reply_markup: keyboard });

    pendingContentTopics.set(ctx.chat.id, { type: `fork:${text}` });
    return;
  }

  // Add to queue for Claude
  queue.push({ ctx, text });
  console.log(`📥 Queued: "${text.slice(0, 50)}..."`);

  logEvent("telegram_message_in", {
    preview: text.slice(0, 120),
    length: text.length,
  }, "claudegolem").catch(() => {});

  if (!isProcessing) {
    processQueue();
  } else if (queue.length > 1) {
    await ctx.reply(`⏳ Queued (${queue.length - 1} ahead)`);
  }
});

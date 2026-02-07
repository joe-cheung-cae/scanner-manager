import type { Priority } from "@/domain/types";

export interface QuickAddParseResult {
  title: string;
  priority?: Priority;
  reminderTime?: string;
  remindBeforeMinutes?: number;
  tags: string[];
}

const TIME_RE = /\b(?:at\s+)?([01]\d|2[0-3]):([0-5]\d)\b/i;
const AT_TIME_RE = /@([01]\d|2[0-3]):([0-5]\d)\b/gi;
const REMIND_RE = /\br:(\d+)([mh])\b/gi;

export function parseQuickAdd(input: string): QuickAddParseResult {
  let working = input.trim();
  let priority: Priority | undefined;

  if (working.startsWith("!!!")) {
    priority = "high";
    working = working.slice(3).trim();
  } else if (working.startsWith("!!")) {
    priority = "med";
    working = working.slice(2).trim();
  } else if (working.startsWith("!")) {
    priority = "low";
    working = working.slice(1).trim();
  }

  const tags = Array.from(working.matchAll(/#([^\s#]+)/g)).map((m) => m[1]);
  working = working.replace(/#([^\s#]+)/g, "").trim();

  let reminderTime: string | undefined;
  const atMatches = Array.from(working.matchAll(AT_TIME_RE));
  if (atMatches.length > 0) {
    const latest = atMatches[atMatches.length - 1];
    reminderTime = `${latest[1]}:${latest[2]}`;
    working = working.replace(AT_TIME_RE, "").trim();
  } else {
    const timeMatch = working.match(TIME_RE);
    if (timeMatch) {
      reminderTime = `${timeMatch[1]}:${timeMatch[2]}`;
      working = working.replace(timeMatch[0], "").trim();
    }
  }

  let remindBeforeMinutes: number | undefined;
  const remindMatches = Array.from(working.matchAll(REMIND_RE));
  if (remindMatches.length > 0) {
    const latest = remindMatches[remindMatches.length - 1];
    const count = Number(latest[1]);
    const unit = latest[2].toLowerCase();
    remindBeforeMinutes = unit === "h" ? count * 60 : count;
    working = working.replace(REMIND_RE, "").trim();
  }

  return {
    title: working,
    priority,
    reminderTime,
    remindBeforeMinutes,
    tags,
  };
}

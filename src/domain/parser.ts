import type { Priority } from "@/domain/types";

export interface QuickAddParseResult {
  title: string;
  priority?: Priority;
  reminderTime?: string;
  tags: string[];
}

const TIME_RE = /\b(?:at\s+)?([01]\d|2[0-3]):([0-5]\d)\b/i;

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

  const timeMatch = working.match(TIME_RE);
  let reminderTime: string | undefined;
  if (timeMatch) {
    reminderTime = `${timeMatch[1]}:${timeMatch[2]}`;
    working = working.replace(timeMatch[0], "").trim();
  }

  return {
    title: working,
    priority,
    reminderTime,
    tags,
  };
}

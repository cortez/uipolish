// A small markdown parser for model replies: CommonMark's common blocks plus
// GitHub's tables, task lists and strikethrough. Blocks only; inline syntax is
// read when rendering. While streaming, the half-typed last line is held back
// when it could still turn into a different block, so raw markers never flash.

export type Align = "left" | "center" | "right" | null;

export type ListItem = { checked: boolean | null; children: Block[] };

export type Block =
  | { type: "paragraph"; text: string }
  | { type: "heading"; depth: number; text: string }
  | { type: "rule" }
  | { type: "code"; language: string; code: string; closed: boolean }
  | { type: "quote"; children: Block[] }
  | { type: "list"; ordered: boolean; start: number; tight: boolean; items: ListItem[] }
  | { type: "table"; align: Align[]; head: string[]; rows: string[][] };

/** A top-level block and the source lines it came from (for memoizing). */
export type Section = { block: Block; source: string };

const FENCE = /^(\s*)(`{3,}|~{3,})(.*)$/;
const HEADING = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?(?:[ \t]+#+)?[ \t]*$/;
const RULE = /^ {0,3}([-*_])(?:[ \t]*\1){2,}[ \t]*$/;
const QUOTE = /^ {0,3}>/;
const ITEM = /^([ \t]*)([-*+]|\d{1,9}[.)])(?:([ \t]+)(.*)|[ \t]*$)/;
const TABLE_RULE = /^ {0,3}\|?[ \t]*:?-+:?[ \t]*(?:\|[ \t]*:?-+:?[ \t]*)*\|?[ \t]*$/;
const TASK = /^\[([ xX])\](?:[ \t]+|$)/;

// A last line that could still become another block: a heading's #, a list
// marker, a task's box, a quote's >, a fence or rule on its way, any table row.
const UNSETTLED = /^\s*(?:#{1,6}|[-+*]|\d{1,9}[.)]?|>+|`{1,2}|~{1,2}|(?:`{3,}|~{3,}).*|[-*_=]{2,}|(?:[-+*]|\d{1,9}[.)])[ \t]+\[[ xX]?\]?|\|.*)[ \t]*$/;

const blank = (line: string) => !line.trim();
const indentOf = (line: string) => /^[ \t]*/.exec(line)![0].length;

/** Fence opener or closer: its character, length and info string. */
function fence(line: string) {
  const m = FENCE.exec(line);
  if (!m || (m[2][0] === "`" && m[3].includes("`"))) return null;
  return { indent: m[1].length, marker: m[2], info: m[3].trim() };
}

const closes = (line: string, open: string) => {
  const f = fence(line);
  return !!f && f.marker[0] === open[0] && f.marker.length >= open.length && !f.info;
};

/** Is the source inside a code fence at its end? */
function inFence(lines: string[]) {
  let open: string | null = null;
  for (const line of lines) {
    if (open) {
      if (closes(line, open)) open = null;
    } else {
      const f = fence(line);
      if (f) open = f.marker;
    }
  }
  return open !== null;
}

const isTableStart = (lines: string[], i: number) =>
  lines[i].includes("|") && i + 1 < lines.length && lines[i + 1].includes("|") && TABLE_RULE.test(lines[i + 1]);

/** Lines that end a paragraph. */
const interrupts = (lines: string[], i: number) => {
  const line = lines[i];
  return !!fence(line) || HEADING.test(line) || RULE.test(line) || QUOTE.test(line) || isTableStart(lines, i) || (ITEM.test(line) && !!ITEM.exec(line)![4]?.trim());
};

/** Table cells, splitting on pipes that aren't escaped or inside code. */
export function cells(row: string) {
  let s = row.trim();
  if (s.startsWith("|")) s = s.slice(1);
  if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
  const out: string[] = [];
  let cell = "";
  let tick = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "\\" && s[i + 1] === "|") {
      cell += "|";
      i++;
    } else if (ch === "`") {
      let n = 1;
      while (s[i + n] === "`") n++;
      tick = tick === n ? 0 : tick || n;
      cell += s.slice(i, i + n);
      i += n - 1;
    } else if (ch === "|" && !tick) {
      out.push(cell.trim());
      cell = "";
    } else cell += ch;
  }
  out.push(cell.trim());
  return out;
}

function alignOf(cell: string): Align {
  const c = cell.trim();
  const left = c.startsWith(":");
  const right = c.endsWith(":");
  return left && right ? "center" : right ? "right" : left ? "left" : null;
}

type Parsed = { block: Block | null; next: number };

function parseOne(lines: string[], i: number, streaming: boolean): Parsed {
  const line = lines[i];

  const open = fence(line);
  if (open) {
    const body: string[] = [];
    let j = i + 1;
    let closed = false;
    for (; j < lines.length; j++) {
      if (closes(lines[j], open.marker)) {
        closed = true;
        j++;
        break;
      }
      // Body lines lose as much indentation as the opening fence had.
      const strip = Math.min(open.indent, indentOf(lines[j]));
      body.push(lines[j].slice(strip));
    }
    const language = open.info.split(/\s+/)[0] ?? "";
    return { block: { type: "code", language, code: body.join("\n"), closed }, next: j };
  }

  const heading = HEADING.exec(line);
  if (heading) return { block: { type: "heading", depth: heading[1].length, text: heading[2] ?? "" }, next: i + 1 };

  if (RULE.test(line)) return { block: { type: "rule" }, next: i + 1 };

  if (QUOTE.test(line)) {
    const inner: string[] = [];
    let j = i;
    // Quote lines, and lazy lines that continue the quote's paragraph.
    while (j < lines.length) {
      if (QUOTE.test(lines[j])) inner.push(lines[j].replace(/^ {0,3}> ?/, ""));
      else if (!blank(lines[j]) && inner.length && !blank(inner[inner.length - 1]) && !interrupts(lines, j)) inner.push(lines[j]);
      else break;
      j++;
    }
    return { block: { type: "quote", children: parseBlocks(inner, streaming) }, next: j };
  }

  if (ITEM.test(line)) return parseList(lines, i, streaming);

  if (isTableStart(lines, i)) {
    const head = cells(lines[i]);
    const align = cells(lines[i + 1]).map(alignOf);
    const rows: string[][] = [];
    let j = i + 2;
    while (j < lines.length && !blank(lines[j]) && lines[j].includes("|") && !interrupts(lines, j)) {
      // Every row has the header's columns: a short row is padded, a long one cut.
      const row = cells(lines[j]);
      rows.push(head.map((_, c) => row[c] ?? ""));
      j++;
    }
    return { block: { type: "table", align: head.map((_, c) => align[c] ?? null), head, rows }, next: j };
  }

  // Rows of a table whose divider hasn't arrived: hold them back until it does.
  const rest = lines.slice(i, blank(lines[lines.length - 1]) ? -1 : undefined);
  if (streaming && rest.every((l) => l.trim().startsWith("|"))) {
    return { block: null, next: lines.length };
  }

  // A paragraph always takes its first line, so nothing can stall the loop.
  const para = [line.trim()];
  let j = i + 1;
  while (j < lines.length && !blank(lines[j]) && !interrupts(lines, j)) para.push(lines[j++].trim());
  return { block: { type: "paragraph", text: para.join("\n") }, next: j };
}

function parseList(lines: string[], i: number, streaming: boolean): Parsed {
  const first = ITEM.exec(lines[i])!;
  const indent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const start = ordered ? parseInt(first[2], 10) : 1;
  const items: ListItem[] = [];
  let tight = true;

  const sibling = (line: string) => {
    const m = ITEM.exec(line);
    return !!m && !RULE.test(line) && m[1].length <= indent + 1 && /\d/.test(m[2]) === ordered;
  };

  while (i < lines.length && sibling(lines[i])) {
    const m = ITEM.exec(lines[i])!;
    // Where the item's text starts; deeper lines belong to the item.
    const content = m[1].length + m[2].length + Math.min(m[3]?.length ?? 1, 4);
    const body = [m[4] ?? ""];
    i++;
    while (i < lines.length) {
      const line = lines[i];
      if (blank(line)) {
        let j = i;
        while (j < lines.length && blank(lines[j])) j++;
        if (j < lines.length && indentOf(lines[j]) > indent + 1 && !sibling(lines[j])) {
          tight = false;
          for (; i < j; i++) body.push("");
          continue;
        }
        break;
      }
      const ind = indentOf(line);
      if (ind > indent && !sibling(line)) {
        body.push(line.slice(Math.min(ind, content)));
      } else if (!blank(body[body.length - 1]) && !interrupts(lines, i) && !ITEM.test(line)) {
        // A lazy line: it carries on the item's paragraph.
        body.push(line.trim());
      } else break;
      i++;
    }

    const task = TASK.exec(body[0]);
    if (task) body[0] = body[0].slice(task[0].length);
    items.push({ checked: task ? task[1] !== " " : null, children: parseBlocks(body, streaming) });

    // A blank line between items makes the list loose.
    let j = i;
    while (j < lines.length && blank(lines[j])) j++;
    if (j > i && j < lines.length && sibling(lines[j])) {
      tight = false;
      i = j;
    }
  }
  return { block: { type: "list", ordered, start, tight, items }, next: i };
}

function parseBlocks(lines: string[], streaming: boolean): Block[] {
  return parseSections(lines, streaming).map((s) => s.block);
}

function parseSections(lines: string[], streaming: boolean): Section[] {
  const out: Section[] = [];
  let i = 0;
  while (i < lines.length) {
    if (blank(lines[i])) {
      i++;
      continue;
    }
    const { block, next } = parseOne(lines, i, streaming);
    if (block) out.push({ block, source: lines.slice(i, next).join("\n") });
    i = next;
  }
  return out;
}

/** The source as blocks. While `streaming`, a half-typed last line that
 *  could still change what block it is waits for the rest of its line. */
export function parse(source: string, streaming = false): Section[] {
  const lines = source.replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n");
  if (streaming && lines.length) {
    const last = lines[lines.length - 1];
    if (last && UNSETTLED.test(last) && !inFence(lines.slice(0, -1))) lines.pop();
  }
  return parseSections(lines, streaming);
}

// ---------- Links ----------

/** A link's href if it's safe to follow: http(s), mailto, tel or relative. */
export function safeHref(raw: string): string | null {
  const href = raw.trim().replace(/^<|>$/g, "");
  const probe = href.replace(/[\u0000- \u007F]+/g, "").toLowerCase();
  if (/^(https?:|mailto:|tel:)/.test(probe)) return href;
  if (/^[a-z][a-z0-9+.-]*:/.test(probe) || probe.startsWith("//")) return null;
  return href;
}

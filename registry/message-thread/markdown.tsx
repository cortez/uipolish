import type { ReactNode } from "react";

/* Markdown subset for chat replies. Text keeps its source offset so streaming can tell new
   words from old; unclosed ** and ` run to the line's end so markers never flash. */

export type Inline = { kind: "text" | "strong" | "code"; start: number; text: string };
export type Line = { start: number; pieces: Inline[] };
export type Block =
  | { kind: "p"; start: number; lines: Line[] }
  | { kind: "ul" | "ol"; start: number; first: number; items: { start: number; lines: Line[] }[] };

const BULLET = /^(\s*)([-*•])\s+/;
const NUMBER = /^(\s*)(\d{1,4})[.)]\s+/;

function parseInline(text: string, base: number): Line {
  return { start: base, pieces: parsePieces(text, base) };
}

function parsePieces(text: string, base: number): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  let plain = "";
  let plainStart = base;
  const flush = () => {
    if (plain) out.push({ kind: "text", start: plainStart, text: plain });
    plain = "";
  };
  while (i < text.length) {
    const marker = text.startsWith("**", i) ? "**" : text[i] === "`" ? "`" : null;
    if (!marker) {
      if (!plain) plainStart = base + i;
      plain += text[i++];
      continue;
    }
    const open = i + marker.length;
    const close = text.indexOf(marker, open);
    const end = close === -1 ? text.length : close;
    flush();
    if (end > open) out.push({ kind: marker === "`" ? "code" : "strong", start: base + open, text: text.slice(open, end) });
    i = close === -1 ? text.length : close + marker.length;
  }
  flush();
  return out;
}

export function parse(source: string): Block[] {
  const blocks: Block[] = [];
  let current = null as Block | null;
  let offset = 0;

  for (const raw of source.split("\n")) {
    const lineStart = offset;
    offset += raw.length + 1;

    if (!raw.trim()) {
      current = null;
      continue;
    }
    const bullet = BULLET.exec(raw);
    const number = bullet ? null : NUMBER.exec(raw);
    const marker = bullet ?? number;

    if (marker) {
      const kind = bullet ? "ul" : "ol";
      const content = raw.slice(marker[0].length);
      const item = { start: lineStart, lines: [parseInline(content, lineStart + marker[0].length)] };
      if (current?.kind === kind) current.items.push(item);
      else {
        current = { kind, start: lineStart, first: number ? Number(number[2]) : 1, items: [item] };
        blocks.push(current);
      }
      continue;
    }

    // An indented line under a list item continues that item.
    if (current && current.kind !== "p" && /^\s/.test(raw)) {
      const lead = raw.length - raw.trimStart().length;
      current.items.at(-1)!.lines.push(parseInline(raw.trimStart(), lineStart + lead));
      continue;
    }

    if (current?.kind === "p") current.lines.push(parseInline(raw, lineStart));
    else {
      current = { kind: "p", start: lineStart, lines: [parseInline(raw, lineStart)] };
      blocks.push(current);
    }
  }
  return blocks;
}

/** Text to React children; streaming wraps new words. */
export type RenderText = (text: string, start: number) => ReactNode;

const plainText: RenderText = (text) => text;

function renderLines(lines: Line[], renderText: RenderText, tail: ReactNode) {
  return lines.map((line, n) => (
    <span key={line.start}>
      {n > 0 && <br />}
      {line.pieces.map((piece) => {
        const content = renderText(piece.text, piece.start);
        if (piece.kind === "code") return <code key={piece.start}>{content}</code>;
        if (piece.kind === "strong") return <strong key={piece.start}>{content}</strong>;
        return <span key={piece.start}>{content}</span>;
      })}
      {n === lines.length - 1 && tail}
    </span>
  ));
}

/** Renders parsed blocks; `tail` goes right after the newest word. */
export function renderBlocks(blocks: Block[], renderText: RenderText = plainText, tail: ReactNode = null) {
  return blocks.map((block, b) => {
    const blockTail = b === blocks.length - 1 ? tail : null;
    if (block.kind === "p") return <p key={block.start}>{renderLines(block.lines, renderText, blockTail)}</p>;
    const items = block.items.map((item, i) => (
      <li key={item.start}>{renderLines(item.lines, renderText, i === block.items.length - 1 ? blockTail : null)}</li>
    ));
    return block.kind === "ul" ? (
      <ul key={block.start}>{items}</ul>
    ) : (
      <ol key={block.start} start={block.first === 1 ? undefined : block.first}>
        {items}
      </ol>
    );
  });
}

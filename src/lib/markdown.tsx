import type { ReactNode } from "react";
import { CodeBlock } from "@registry/code-block/code-block";
import site from "@/app/site.module.css";

// A small renderer for the guides: headings, paragraphs, lists,
// tables, quotes, code fences, inline code, bold and links. The sources are
// ours, so it only needs to handle what they use.

/** Inline code, bold and links in one line of text. */
export function inline(text: string, key = 0): ReactNode[] {
  const out: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*[^*]+\*\*|\[[^\]]+\]\([^)]+\))/g;
  let last = 0;
  let i = key;
  for (const match of text.matchAll(pattern)) {
    if (match.index > last) out.push(text.slice(last, match.index));
    const token = match[0];
    if (token.startsWith("`")) out.push(<code key={i++}>{token.slice(1, -1)}</code>);
    else if (token.startsWith("**")) out.push(<strong key={i++}>{inline(token.slice(2, -2), i * 100)}</strong>);
    else {
      const [, label, href] = /\[([^\]]+)\]\(([^)]+)\)/.exec(token)!;
      out.push(
        <a key={i++} href={href}>
          {label}
        </a>,
      );
    }
    last = match.index + token.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A table row's cells. A `\|` (a union type, say) is a pipe inside a cell,
 *  not a column break. */
const cells = (row: string) =>
  row
    .trim()
    .replace(/^\||(?<!\\)\|$/g, "")
    .split(/(?<!\\)\|/)
    .map((c) => c.trim().replace(/\\\|/g, "|"));

/** A heading's anchor: its words, lowercased and dashed. */
function slug(text: string) {
  return text
    .toLowerCase()
    .replace(/[`*]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function Markdown({ source, skipTitle = false }: { source: string; skipTitle?: boolean }) {
  const lines = source.split("\n");
  const blocks: ReactNode[] = [];
  const ids = new Set<string>();
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)/.exec(line);
    if (heading) {
      i++;
      if (heading[1].length === 1 && skipTitle) continue;
      // Under a page that renders its own h1, ## is a section (h2); a
      // document with its own title shifts down one so it never adds an h1.
      const level = Math.min(heading[1].length + (skipTitle ? 0 : 1), 4);
      const Tag = `h${level}` as "h2" | "h3" | "h4";
      // Every heading links to itself, so a section can be shared.
      let id = slug(heading[2]);
      for (let n = 2; ids.has(id); n++) id = `${slug(heading[2])}-${n}`;
      ids.add(id);
      blocks.push(
        <Tag key={k++} id={id}>
          <a href={`#${id}`}>{inline(heading[2])}</a>
        </Tag>,
      );
      continue;
    }
    // A quote: its lines join into paragraphs; a bare ">" starts the next one.
    if (line.startsWith(">")) {
      const paras: string[][] = [[]];
      while (i < lines.length && lines[i].startsWith(">")) {
        const text = lines[i++].replace(/^>\s?/, "").trim();
        if (text) paras[paras.length - 1].push(text);
        else paras.push([]);
      }
      blocks.push(
        <blockquote key={k++}>
          {paras.filter((p) => p.length).map((p, j) => (
            <p key={j}>{inline(p.join(" "))}</p>
          ))}
        </blockquote>,
      );
      continue;
    }
    if (line.startsWith("```")) {
      const lang = line.slice(3).trim();
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) body.push(lines[i++]);
      i++;
      blocks.push(
        <CodeBlock key={k++} className={site.code} code={body.join("\n")} language={lang || undefined} />,
      );
      continue;
    }
    if (line.trim().startsWith("|")) {
      const rows: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) rows.push(lines[i++]);
      const [head, , ...body] = rows;
      const labels = cells(head).map((c) => c.replace(/[`*]/g, ""));
      blocks.push(
        <div key={k++} className={site.table} data-stack="" tabIndex={0}>
          <table>
            <thead>
              <tr>
                {cells(head).map((c, j) => (
                  <th key={j}>{inline(c)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((r, j) => (
                <tr key={j}>
                  {cells(r).map((c, m) => (
                    <td key={m} data-label={labels[m]}>
                      {inline(c)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const listItem = /^(\s*)(-|\d+\.)\s+(.*)/;
    if (listItem.test(line)) {
      const ordered = /^\s*\d+\./.test(line);
      const items: string[] = [];
      while (i < lines.length && (listItem.test(lines[i]) || (lines[i].startsWith("  ") && lines[i].trim()))) {
        const m = listItem.exec(lines[i]);
        if (m && m[1].length === 0) items.push(m[3]);
        else items[items.length - 1] += " " + lines[i].trim().replace(/^-\s+/, "");
        i++;
      }
      const List = ordered ? "ol" : "ul";
      blocks.push(
        <List key={k++}>
          {items.map((item, j) => (
            <li key={j}>{inline(item)}</li>
          ))}
        </List>,
      );
      continue;
    }
    // A paragraph always takes at least its first line, so a line that
    // starts like a block but isn't one ("#ops-alerts") can't stall the loop.
    const para: string[] = [lines[i++].trim()];
    while (i < lines.length && lines[i].trim() && !/^(#|```|\||>|\s*(-|\d+\.)\s)/.test(lines[i])) para.push(lines[i++].trim());
    blocks.push(<p key={k++}>{inline(para.join(" "))}</p>);
  }

  return <>{blocks}</>;
}

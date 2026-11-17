/**
 * A component's CSS module, ready for a Tailwind CSS v4 project: its styles
 * inside Tailwind's components layer, so a utility class passed in
 * className (utilities layer) overrides them, while the preflight reset
 * (base layer) stays below them. The file names the layer order itself, so
 * the order holds whichever stylesheet loads first.
 *
 * Two things can't go in a layer and stay at the top: @property rules, and
 * `composes`, which CSS modules only allow in a top-level rule. A rule that
 * composes keeps just that line up top (it emits no CSS, only the class
 * mapping) and the rest of its declarations move into the layer.
 */
export function inTailwindLayer(css: string): string {
  const top: string[] = [];
  const layered: string[] = [];
  for (const statement of statements(css)) {
    // Read with comments blanked out, at the same offsets, so a rule quoted
    // in a comment is never taken for a real one.
    const code = statement.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
    if (/^\s*@property\b/.test(code)) {
      top.push(statement);
      continue;
    }
    const open = code.indexOf("{");
    const head = code.slice(0, open).trim();
    const composes = open > 0 && !head.startsWith("@") ? [...code.matchAll(/^[ \t]*composes:[^;]*;[ \t]*\n?/gm)] : [];
    if (composes.length === 0) {
      layered.push(statement);
      continue;
    }
    // Its leading comment goes up with the composes; any other declarations
    // stay in the layer under the same selector.
    const lead = statement.slice(0, code.search(/\S/)).trim();
    top.push([lead, `${head} {\n${composes.map((m) => `  ${m[0].trim()}`).join("\n")}\n}`].filter(Boolean).join("\n"));
    let body = statement.slice(open + 1, statement.lastIndexOf("}"));
    for (const m of composes.reverse()) {
      const at = m.index - open - 1;
      body = body.slice(0, at) + body.slice(at + m[0].length);
    }
    const left = code.slice(open + 1, code.lastIndexOf("}")).replace(/^[ \t]*composes:[^;]*;/gm, "");
    if (left.trim()) layered.push(`${head} {${body}}`);
  }
  const body = layered.join("\n\n").replace(/^(?=.)/gm, "  ");
  return ["@layer theme, base, components, utilities;", ...top, `@layer components {\n${body}\n}`].join("\n\n") + "\n";
}

/** Top-level statements, each with the comments just before it. Skips over
 *  comments and strings, so a brace in either doesn't count. */
function statements(css: string): string[] {
  const out: string[] = [];
  let start = 0;
  let depth = 0;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      i = end === -1 ? css.length : end + 1;
    } else if (c === '"' || c === "'") {
      for (i++; i < css.length && css[i] !== c; i++) if (css[i] === "\\") i++;
    } else if (c === "{") {
      depth++;
    } else if (c === "}" || (c === ";" && depth === 0)) {
      if (c === "}") depth--;
      if (depth === 0) {
        const statement = css.slice(start, i + 1).trim();
        if (statement) out.push(statement);
        start = i + 1;
      }
    }
  }
  const tail = css.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

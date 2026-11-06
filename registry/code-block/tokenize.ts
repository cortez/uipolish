/** A small line tokenizer. A line's tokens depend only on its text and start state. */

/**
 * - `keyword`: declarations and operators (`const`, `import`, `typeof`); CSS pseudo-classes.
 * - `control`: flow (`if`, `return`, `await`); CSS at-rules; shell `if`, `then`.
 * - `literal`: `true`, `false`, `null`, `undefined`, `this`; Python `None`, `self`.
 * - `function`: a name that's called or declared as one; a shell command; a CSS function.
 * - `type`: PascalCase names, primitive types after `:`, names after `class`, `new`, `extends`.
 * - `property`: a name after `.`, or an object key.
 * - `tag` / `attr`: JSX tag and attribute names; CSS element selectors and `[attr]`; shell flags are `attr`.
 * - `selector`: CSS `.class` and `#id`.
 * - `variable`: shell `$VAR`; CSS custom properties.
 * - `key`: a JSON key or a CSS property name. `value`: a word in a CSS value.
 * - `punctuation`: brackets, operators, separators.
 */
export type TokenType =
  | "plain"
  | "keyword"
  | "control"
  | "string"
  | "comment"
  | "number"
  | "literal"
  | "function"
  | "type"
  | "property"
  | "tag"
  | "attr"
  | "selector"
  | "variable"
  | "key"
  | "value"
  | "punctuation";
export type Token = { type: TokenType; text: string };
/**
 * Carried from one line to the next. `""` means nothing is open. `jsx:…` is
 * the stack of open JSX tags, children and `{…}` expressions; `sh-args`
 * follows a shell line that ended in `\`; `css-value` a CSS value that runs
 * onto the next line.
 */
export type LineState =
  | ""
  | "block-comment"
  | "template"
  | 'triple"'
  | "triple'"
  | "sh-args"
  | "css-value"
  | `jsx:${string}`;

type Family = "js" | "py" | "sh" | "json" | "css";

const FAMILIES: Record<string, Family> = {
  js: "js", jsx: "js", javascript: "js", mjs: "js", cjs: "js",
  ts: "js", tsx: "js", typescript: "js",
  py: "py", python: "py",
  sh: "sh", bash: "sh", shell: "sh", zsh: "sh", console: "sh",
  json: "json", jsonc: "json",
  css: "css",
};

/** Languages whose `<Name` can open a JSX tag. Plain TS has generics there instead. */
const JSX = new Set(["js", "jsx", "javascript", "mjs", "cjs", "tsx"]);

const words = (list: string) => new Set(list.split(" "));

const JS_KEYWORDS = words(
  "class const default delete enum export extends function implements import in instanceof interface keyof let new private protected public typeof var void",
);
/** Keywords only when followed by a name, so `item.type` and `const from = 1` stay plain. */
const JS_CONTEXTUAL = words(
  "abstract accessor as asserts async declare from get infer is module namespace of override readonly satisfies set static type unique",
);
const JS_CONTROL = words(
  "await break case catch continue debugger do else finally for if return switch throw try while with yield",
);
const JS_LITERALS = words("true false null undefined this super NaN Infinity");
const JS_PRIMITIVES = words("string number boolean any unknown never object bigint symbol");
/** The name after one of these is a type. */
const JS_TYPE_INTRO = words("class interface type enum extends implements new namespace keyof typeof satisfies as is");

const PY_KEYWORDS = words("and as class def del from global import in is lambda nonlocal not or pass async");
const PY_CONTROL = words(
  "assert await break case continue elif else except finally for if match raise return try while with yield",
);
const PY_LITERALS = words("True False None self cls");

const SH_CONTROL = words("if then else elif fi for while until do done case esac function in select return");
/** These run the command that follows them. */
const SH_PREFIX = words("sudo time exec command env nohup xargs");

/** Whether `language` has a tokenizer. */
export function canTokenize(language: string | undefined) {
  return !!language && language.toLowerCase() in FAMILIES;
}

const NUMBER = /^(?:0[xX][\da-fA-F_]+|0[bB][01_]+|(?:\d[\d_]*\.?[\d_]*|\.\d[\d_]*)(?:[eE][+-]?\d+)?n?)/;
const WORD = /^[A-Za-z_$][\w$]*/;
// Hyphens included, so `--ui-space-3` is one word and its 3 isn't a number.
const CSS_WORD = /^-{0,2}[A-Za-z_][\w-]*/;
const CSS_UNIT = /^(?:%|[a-zA-Z]+)/;
const PUNCT = /^(?:=>|\?\?=?|\?\.|\.\.\.|[=!]==?|[<>]=?|&&=?|\|\|=?|\*\*|[-+*/%&|^~!?:;,.(){}[\]<>=@#\\])/;
const PASCAL = /^[A-Z](?:[\w$]*[a-z][\w$]*)?$/;

export function tokenizeLine(line: string, language: string, state: LineState = ""): { tokens: Token[]; state: LineState } {
  const lang = language.toLowerCase();
  const family = FAMILIES[lang];
  if (!family) return { tokens: [{ type: "plain", text: line }], state: "" };

  const tokens: Token[] = [];
  const push = (type: TokenType, text: string) => {
    if (!text) return;
    const last = tokens.at(-1);
    if (last && last.type === type) last.text += text;
    else tokens.push({ type, text });
  };
  const emit = (inner: Token[]) => inner.forEach((t) => push(t.type, t.text));

  if (family === "css") return { tokens, state: css(line, state, push) };
  if (family === "sh") return shell(line, lang, state, tokens, push);

  let i = 0;
  // Open JSX contexts: "t" in a tag, "x" in children, "e<n>" in a {…} expression n braces deep.
  const stack: string[] = state.startsWith("jsx:") ? state.slice(4).split(",") : [];
  const jsx = family === "js" && JSX.has(lang);

  if (state === "block-comment" || state === 'triple"' || state === "triple'") {
    const close = state === "block-comment" ? "*/" : state === 'triple"' ? '"""' : "'''";
    const end = findClose(line, 0, close, state !== "block-comment");
    const type = state === "block-comment" ? "comment" : "string";
    if (end === -1) {
      push(type, line);
      return { tokens, state };
    }
    push(type, line.slice(0, end));
    i = end;
  } else if (state === "template") {
    const end = template(line, 0, lang, push, emit);
    if (end === -1) return { tokens, state };
    i = end;
  }

  while (i < line.length) {
    const rest = line.slice(i);
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : "";
    const frame = stack.at(-1);

    // ---------- JSX ----------
    if (frame === "x" || frame === "t" || (jsx && ch === "<" && jsxStarts(line, i))) {
      const close = /^<\/\s*([A-Za-z][\w.:-]*)?\s*>/.exec(rest);
      if (ch === "<" && close) {
        const name = close[1] ?? "";
        const at = close[0].indexOf(name, 2);
        push("punctuation", close[0].slice(0, name ? at : close[0].length - 1));
        push("tag", name);
        push("punctuation", name ? close[0].slice(at + name.length) : ">");
        if (stack.at(-1) === "x") stack.pop();
        i += close[0].length;
        continue;
      }
      const open = /^<([A-Za-z][\w.:-]*)?/.exec(rest);
      if (ch === "<" && open && (open[1] || line[i + 1] === ">")) {
        push("punctuation", "<");
        if (open[1]) {
          push("tag", open[1]);
          stack.push("t");
          i += open[0].length;
        } else {
          push("punctuation", ">");
          stack.push("x");
          i += 2;
        }
        continue;
      }
      if (frame === "x") {
        if (ch === "{") {
          push("punctuation", ch);
          stack.push("e1");
          i++;
          continue;
        }
        const text = /^[^<{]+/.exec(rest)?.[0] ?? ch;
        push("plain", text);
        i += text.length;
        continue;
      }
      if (frame === "t") {
        if (rest.startsWith("/>")) {
          push("punctuation", "/>");
          stack.pop();
          i += 2;
          continue;
        }
        if (ch === ">") {
          push("punctuation", ch);
          stack[stack.length - 1] = "x";
          i++;
          continue;
        }
        if (ch === "{") {
          push("punctuation", ch);
          stack.push("e1");
          i++;
          continue;
        }
        if (ch === '"' || ch === "'") {
          const end = findClose(line, i + 1, ch, false);
          const stop = end === -1 ? line.length : end;
          push("string", line.slice(i, stop));
          i = stop;
          continue;
        }
        const attr = /^[A-Za-z_$][\w$:.-]*/.exec(rest);
        if (attr) {
          push("attr", attr[0]);
          i += attr[0].length;
          continue;
        }
        push(/\s/.test(ch) ? "plain" : "punctuation", ch);
        i++;
        continue;
      }
    }

    // A {…} expression inside JSX ends at its matching brace.
    if (frame?.startsWith("e") && (ch === "{" || ch === "}")) {
      const depth = Number(frame.slice(1)) + (ch === "{" ? 1 : -1);
      if (depth === 0) stack.pop();
      else stack[stack.length - 1] = `e${depth}`;
      push("punctuation", ch);
      i++;
      continue;
    }

    // ---------- Comments ----------
    if ((family === "js" || family === "json") && rest.startsWith("//")) {
      push("comment", rest);
      break;
    }
    if ((family === "js" || family === "json") && rest.startsWith("/*")) {
      const end = findClose(line, i + 2, "*/", false);
      if (end === -1) {
        push("comment", rest);
        return { tokens, state: "block-comment" };
      }
      push("comment", line.slice(i, end));
      i = end;
      continue;
    }
    if (family === "py" && ch === "#") {
      push("comment", rest);
      break;
    }

    // ---------- Strings ----------
    if (family === "py" && (rest.startsWith('"""') || rest.startsWith("'''"))) {
      const quote = rest.slice(0, 3);
      const end = findClose(line, i + 3, quote, true);
      if (end === -1) {
        push("string", rest);
        return { tokens, state: quote === '"""' ? 'triple"' : "triple'" };
      }
      push("string", line.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "`" && family === "js") {
      push("string", "`");
      const end = template(line, i + 1, lang, push, emit);
      if (end === -1) return { tokens, state: "template" };
      i = end;
      continue;
    }
    if (ch === '"' || (ch === "'" && family !== "json")) {
      let end = findClose(line, i + 1, ch, true);
      if (end === -1) end = line.length;
      const isKey = family === "json" && /^\s*:/.test(line.slice(end));
      push(isKey ? "key" : "string", line.slice(i, end));
      i = end;
      continue;
    }

    // ---------- Numbers ----------
    if (/[\d.]/.test(ch) && !/[\w$]/.test(prev)) {
      const match = NUMBER.exec(rest);
      if (match && match[0] !== ".") {
        push("number", match[0]);
        i += match[0].length;
        continue;
      }
    }

    // ---------- Words ----------
    if (family === "py" && ch === "@" && WORD.test(line.slice(i + 1)) && !line.slice(0, i).trim()) {
      const name = WORD.exec(line.slice(i + 1))![0];
      push("function", "@" + name);
      i += name.length + 1;
      continue;
    }
    const word = WORD.exec(rest);
    if (word) {
      const w = word[0];
      const after = line.slice(i + w.length);
      push(family === "js" ? jsWord(w, line, i, after) : family === "py" ? pyWord(w, line, i, after) : jsonWord(w), w);
      i += w.length;
      continue;
    }

    const punct = PUNCT.exec(rest);
    if (punct) {
      push("punctuation", punct[0]);
      i += punct[0].length;
      continue;
    }
    push("plain", ch);
    i++;
  }

  return { tokens, state: stack.length ? `jsx:${stack.join(",")}` : "" };
}

/** The last non-space character before `i`, or `""` at the start of the line. */
function before(line: string, i: number) {
  return /(\S)\s*$/.exec(line.slice(0, i))?.[1] ?? "";
}

/** The word just before `i`, skipping spaces. */
function wordBefore(line: string, i: number) {
  return /([A-Za-z_$][\w$]*)\s*$/.exec(line.slice(0, i))?.[1] ?? "";
}

/** `<` opens JSX where an expression can start: after `(`, `=`, `return`, `&&`, `?`… or at a line's start. */
function jsxStarts(line: string, i: number) {
  if (!/[A-Za-z>]/.test(line[i + 1] ?? "")) return false;
  const b = before(line, i);
  if (!b || "([{,;=?:&|>!}".includes(b)) return true;
  return /\b(?:return|yield|default|case)$/.test(line.slice(0, i).trimEnd());
}

function jsWord(w: string, line: string, i: number, after: string): TokenType {
  const b = before(line, i);
  const called = /^\s*(?:\?\.)?\(/.test(after) || /^<[\w\s,.[\]|&]*>\(/.test(after);
  if (b === "." && line[i - 1] === ".") {
    if (called) return "function";
    return PASCAL.test(w) ? "type" : "property";
  }
  if (b === "." && line.slice(i - 2, i) === "?.") return called ? "function" : "property";
  // An object or type-literal key: `{ kind: "fee" }`, `onSend?: () => void`.
  if (/^\??:(?!:)/.test(after.trimStart()) && (!b || "{,;".includes(b)) && !JS_CONTROL.has(w) && w !== "default") {
    return "property";
  }
  if (JS_LITERALS.has(w)) return "literal";
  if (JS_CONTROL.has(w)) return "control";
  if (JS_KEYWORDS.has(w)) return "keyword";
  if (JS_CONTEXTUAL.has(w) && /^\s+[\w$*{["'`]/.test(after) && !/^\s+(?:in|of|instanceof)\b/.test(after)) {
    return "keyword";
  }
  const prevWord = b && /[\w$]/.test(b) ? wordBefore(line, i) : "";
  if (JS_TYPE_INTRO.has(prevWord) && prevWord !== "type") return PASCAL.test(w) || prevWord !== "new" ? "type" : "plain";
  if (prevWord === "type" && /^\s*[=<]/.test(after)) return "type";
  if (called) return prevWord === "new" ? "type" : "function";
  if (prevWord === "function") return "function";
  if (PASCAL.test(w)) return "type";
  if (JS_PRIMITIVES.has(w) && (":|&<,=([".includes(b) || prevWord === "keyof" || prevWord === "extends")) return "type";
  return "plain";
}

function pyWord(w: string, line: string, i: number, after: string): TokenType {
  const b = before(line, i);
  const called = /^\s*\(/.test(after);
  if (b === "." && line[i - 1] === ".") return called ? "function" : PASCAL.test(w) ? "type" : "property";
  if (PY_LITERALS.has(w)) return "literal";
  if (PY_CONTROL.has(w)) return "control";
  if (PY_KEYWORDS.has(w)) return "keyword";
  const prevWord = b && /\w/.test(b) ? wordBefore(line, i) : "";
  if (prevWord === "def") return "function";
  if (prevWord === "class") return "type";
  if (called) return PASCAL.test(w) ? "type" : "function";
  if (PASCAL.test(w)) return "type";
  return "plain";
}

function jsonWord(w: string): TokenType {
  return w === "true" || w === "false" || w === "null" ? "literal" : "plain";
}

/**
 * Pushes a template literal's body from `from`, with `${…}` tokenized as
 * code. Returns the index past the closing backtick, or -1 if the line ends
 * first (an interpolation that runs past the line stays string-colored).
 */
function template(
  line: string,
  from: number,
  lang: string,
  push: (type: TokenType, text: string) => void,
  emit: (tokens: Token[]) => void,
) {
  let start = from;
  for (let j = from; j < line.length; j++) {
    if (line[j] === "\\") {
      j++;
      continue;
    }
    if (line[j] === "`") {
      push("string", line.slice(start, j + 1));
      return j + 1;
    }
    if (line.startsWith("${", j)) {
      const end = matchBrace(line, j + 2);
      if (end === -1) break;
      push("string", line.slice(start, j));
      push("punctuation", "${");
      // `ts` so a `<` inside isn't read as JSX.
      emit(tokenizeLine(line.slice(j + 2, end), lang === "tsx" || lang === "jsx" ? "ts" : lang).tokens);
      push("punctuation", "}");
      j = end;
      start = end + 1;
    }
  }
  push("string", line.slice(start));
  return -1;
}

/** Index of the `}` that closes a brace opened just before `from`, skipping strings. -1 if none on the line. */
function matchBrace(line: string, from: number) {
  let depth = 1;
  for (let j = from; j < line.length; j++) {
    const c = line[j];
    if (c === '"' || c === "'" || c === "`") {
      const end = findClose(line, j + 1, c, true);
      if (end === -1) return -1;
      j = end - 1;
    } else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) return j;
  }
  return -1;
}

// ---------- Shell ----------

function shell(
  line: string,
  lang: string,
  state: LineState,
  tokens: Token[],
  push: (type: TokenType, text: string) => void,
): { tokens: Token[]; state: LineState } {
  let i = 0;
  let command = state !== "sh-args";
  if (lang === "console" && state !== "sh-args") {
    // Only prompt lines are commands; the rest is output.
    const prompt = /^\s*[$>]\s/.exec(line);
    if (!prompt) {
      push("plain", line);
      return { tokens, state: "" };
    }
    push("punctuation", prompt[0]);
    i = prompt[0].length;
  }

  while (i < line.length) {
    const rest = line.slice(i);
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : "";

    if (/\s/.test(ch)) {
      const space = /^\s+/.exec(rest)![0];
      push("plain", space);
      i += space.length;
      continue;
    }
    if (ch === "#" && (i === 0 || /\s/.test(prev))) {
      push("comment", rest);
      break;
    }
    if (rest === "\\") {
      push("punctuation", ch);
      return { tokens, state: "sh-args" };
    }
    if (ch === '"' || ch === "'") {
      // Single quotes have no escapes.
      let end = findClose(line, i + 1, ch, ch === '"');
      if (end === -1) end = line.length;
      push("string", line.slice(i, end));
      i = end;
      continue;
    }
    const variable = /^\$(?:\{[^}]*\}|[A-Za-z_]\w*|[\d#?@*$!-])/.exec(rest);
    if (variable) {
      push("variable", variable[0]);
      i += variable[0].length;
      continue;
    }
    const op = /^(?:\$\(|&&|\|\||[|;()&]|\d?>>?&?\d?|<)/.exec(rest);
    if (op) {
      push("punctuation", op[0]);
      i += op[0].length;
      if (!/[<>]/.test(op[0])) command = true;
      continue;
    }
    const word = /^[^\s|&;()<>'"`$]+/.exec(rest)?.[0] ?? ch;
    i += word.length;
    if (command) {
      const assign = /^([A-Za-z_]\w*)=(.*)$/.exec(word);
      if (assign) {
        push("variable", assign[1]);
        push("punctuation", "=");
        push("plain", assign[2]);
      } else if (SH_CONTROL.has(word)) {
        push("control", word);
        command = !/^(?:for|case|select|function|in)$/.test(word);
      } else {
        push("function", word);
        command = SH_PREFIX.has(word);
      }
    } else if (word.startsWith("-") && word.length > 1 && !/^-\d/.test(word)) {
      const eq = word.indexOf("=");
      push("attr", eq === -1 ? word : word.slice(0, eq));
      if (eq !== -1) {
        push("punctuation", "=");
        push("plain", word.slice(eq + 1));
      }
    } else if (SH_CONTROL.has(word) && word === "in") {
      push("control", word);
    } else {
      push(/^-?\d+(?:\.\d+)?$/.test(word) ? "number" : "plain", word);
    }
  }
  return { tokens, state: "" };
}

// ---------- CSS ----------

/** Pushes a CSS line's tokens and returns the state it leaves open. */
function css(line: string, state: LineState, push: (type: TokenType, text: string) => void): LineState {
  let i = 0;
  if (state === "block-comment") {
    const end = findClose(line, 0, "*/", false);
    push("comment", end === -1 ? line : line.slice(0, end));
    if (end === -1) return state;
    i = end;
  }
  type Mode = "selector" | "value" | "prelude" | "start";
  // Before its first `{`, a line is a selector if it opens a block or lists
  // selectors (`a,`); otherwise it starts as declarations.
  const code = line.replace(/\/\*.*?(\*\/|$)/g, "");
  let selectorLine = state !== "css-value" && (/\{/.test(code) || (/,\s*$/.test(code) && !/:\s/.test(code)));
  let mode: Mode = state === "css-value" ? "value" : "start";
  let parens = 0;

  while (i < line.length) {
    const rest = line.slice(i);
    const ch = line[i];
    const prev = i > 0 ? line[i - 1] : "";

    if (rest.startsWith("/*")) {
      const end = findClose(line, i + 2, "*/", false);
      push("comment", end === -1 ? rest : line.slice(i, end));
      if (end === -1) return "block-comment";
      i = end;
      continue;
    }
    if (/\s/.test(ch)) {
      const space = /^\s+/.exec(rest)![0];
      push("plain", space);
      i += space.length;
      continue;
    }
    if (ch === '"' || ch === "'") {
      let end = findClose(line, i + 1, ch, true);
      if (end === -1) end = line.length;
      push("string", line.slice(i, end));
      i = end;
      continue;
    }
    if (ch === "{" || ch === "}" || ch === ";") {
      push("punctuation", ch);
      mode = "start";
      selectorLine = false;
      parens = 0;
      i++;
      continue;
    }
    const at = /^(?:@[\w-]+|!important\b)/.exec(rest);
    if (at) {
      push(at[0].startsWith("@") ? "control" : "keyword", at[0]);
      if (at[0].startsWith("@")) mode = "prelude";
      i += at[0].length;
      continue;
    }

    if (mode === "start" && (selectorLine || /^[^:;]*\{/.test(rest))) mode = "selector";

    if (mode === "selector") {
      const sel = /^(?:[.#][\w-]+|::?[\w-]+|&|\*)/.exec(rest);
      if (sel) {
        const s = sel[0];
        push(s[0] === ":" ? "keyword" : s === "&" || s === "*" ? "tag" : "selector", s);
        i += s.length;
        continue;
      }
      const attr = /^\[\s*([\w-]+)/.exec(rest);
      if (attr) {
        push("punctuation", attr[0].slice(0, attr[0].length - attr[1].length));
        push("attr", attr[1]);
        i += attr[0].length;
        continue;
      }
      const el = CSS_WORD.exec(rest);
      if (el) {
        push(/^(?:from|to)$/.test(el[0]) ? "keyword" : "tag", el[0]);
        i += el[0].length;
        continue;
      }
      push("punctuation", ch);
      i++;
      continue;
    }

    // Declarations, values and at-rule preludes.
    if (ch === "#" && mode === "value") {
      const hex = /^#[\da-fA-F]{3,8}\b/.exec(rest);
      if (hex) {
        push("number", hex[0]);
        i += hex[0].length;
        continue;
      }
    }
    const minus = ch === "-" && /[\d.]/.test(line[i + 1] ?? "") && !/[\w)-]/.test(prev);
    if ((minus || /[\d.]/.test(ch)) && !/[\w-]/.test(prev)) {
      const match = NUMBER.exec(minus ? rest.slice(1) : rest);
      if (match && match[0] !== ".") {
        const sign = minus ? "-" : "";
        const unit = CSS_UNIT.exec(rest.slice(sign.length + match[0].length))?.[0] ?? "";
        push("number", sign + match[0] + unit);
        i += sign.length + match[0].length + unit.length;
        continue;
      }
    }
    const name = CSS_WORD.exec(rest);
    if (name) {
      const n = name[0];
      const after = line.slice(i + n.length);
      if (mode === "start" && /^\s*:/.test(after)) {
        push(n.startsWith("--") ? "variable" : "key", n);
        const colon = after.indexOf(":") + 1;
        push("punctuation", after.slice(0, colon));
        i += n.length + colon;
        mode = "value";
        continue;
      }
      if (mode === "prelude" && parens > 0 && /^\s*:/.test(after)) push("key", n);
      else if (after.startsWith("(")) push("function", n);
      else if (n.startsWith("--")) push("variable", n);
      else if (mode === "prelude" && /^(?:and|or|not|only)$/.test(n)) push("keyword", n);
      else push("value", n);
      i += n.length;
      continue;
    }
    if (ch === "(") parens++;
    if (ch === ")") parens = Math.max(0, parens - 1);
    push("punctuation", ch);
    i++;
  }
  return mode === "value" ? "css-value" : "";
}

/** Index just past `close`, skipping backslash escapes. -1 if the line ends first. */
function findClose(line: string, from: number, close: string, escapes: boolean) {
  for (let i = from; i < line.length; i++) {
    if (escapes && line[i] === "\\") {
      i++;
      continue;
    }
    if (line.startsWith(close, i)) return i + close.length;
  }
  return -1;
}

"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Markdown } from "@registry/markdown/markdown";
import styles from "./preview.module.css";
import own from "./markdown.module.css";

const QUESTION = "Our checkout page gets slow under load. Should we cache the product API?";

const ANSWER = `## Cache the reads, not the cart

Yes, but only the parts that are the same for everyone. Product details and prices change a few times a day; stock and the cart change every second.

1. **Product pages**: cache for 5 minutes and revalidate in the background.
2. **Prices**: cache for 60 seconds, and purge the key when a price is edited.
3. **Stock and cart**: never cache. Read them fresh on every request.
   - Show stock as \`In stock\` or \`Low\`, not an exact count, so a stale page can't promise a unit you don't have.

| Data | TTL | Invalidate on |
|---|---:|---|
| Product details | 300 s | Product edit |
| Prices | 60 s | Price change |
| Stock | 0 | Never cached |

Wrap the fetch so every route caches the same way:

\`\`\`ts
export async function getProduct(id: string) {
  const key = \`product:\${id}\`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit) as Product;

  const product = await db.product.findUnique({ where: { id } });
  await redis.set(key, JSON.stringify(product), "EX", 300);
  return product;
}
\`\`\`

> A cache you can't purge is a bug you can't fix. Wire the purge before you ship the TTL.

Start with prices: they're read on every page and cost the most to compute.`;

const EVERYTHING = `# Heading one
## Heading two
### Heading three
#### Heading four

Plain text with **bold**, *italic*, ***both***, ~~struck~~ and \`inline code\`. A [relative link](/docs/code-block), an [external one](https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching) and a bare URL: https://uipolish.com/docs.
A single line break stays a line break.

HTML shows as written: <script>alert("hi")</script> <b>not bold</b>. Escaped \\*stars\\* stay stars, and snake_case_names stay whole. [A javascript: link](javascript:alert(1)) keeps only its words.

- A bullet
- Another, with a nested list
  - Nested once
    - Nested twice
- Back at the top

3. Numbered from three
4. And four

- [x] Write the cache wrapper
- [ ] Add purge on price edit
- [ ] Load test checkout

> A quote, with **emphasis** inside.
>
> And a second paragraph.

---

| Column | Aligned left | Centered | Right |
|:---|:---|:---:|---:|
| A table that's wider than the bubble | scrolls sideways inside its own box | instead of | 1,024 |
| \`code\` in a cell | [a link](https://example.com) | **bold** | 12 |

\`\`\`sh
npx shadcn@latest add https://uipolish.com/r/markdown.json
\`\`\``;

export function MarkdownPreview() {
  const [run, setRun] = useState(0);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(true);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    let i = 0;
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));
    // Small, uneven chunks, the way tokens arrive: they split markers
    // (**, `, ```, |) in half often enough to show they never flash.
    function step() {
      if (i >= ANSWER.length) {
        setStreaming(false);
        return;
      }
      i = Math.min(ANSWER.length, i + 2 + ((i * 7) % 5));
      setText(ANSWER.slice(0, i));
      later(step, 24 + ((i * 13) % 40));
    }
    later(step, 600);
    return () => timers.current.forEach(clearTimeout);
  }, [run]);

  function replay() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setText("");
    setStreaming(true);
    setRun((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>Streaming</h2>
          <Button variant="secondary" onClick={replay} data-demo-controls="">
            Replay
          </Button>
        </div>
        {/* The live reply shares one cell with an invisible copy of the
            finished one, so the page below doesn't move while it plays. */}
        <div className={own.reserve}>
          <div className={`${own.message} ${own.ghost}`} aria-hidden="true" inert>
            <p className={own.prompt}>{QUESTION}</p>
            <Markdown source={ANSWER} />
          </div>
          <div className={own.message}>
            <p className={own.prompt}>{QUESTION}</p>
            <Markdown source={text} streaming={streaming} />
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Everything it renders</h2>
        <div className={own.message}>
          <Markdown source={EVERYTHING} />
        </div>
      </section>
    </div>
  );
}

"use client";

import { Citation, SourceList, Sources, type Source } from "@registry/sources/sources";
import styles from "./preview.module.css";
import own from "./sources.module.css";

// Real sites, with their marks from brand-marks.
const SOURCES: Source[] = [
  {
    title: "Streaming responses: Route Handlers",
    url: "https://vercel.com/docs/functions/streaming-functions",
    brand: "vercel",
    excerpt: "Return a ReadableStream from a Route Handler and the response is sent to the browser as each chunk is ready.",
  },
  {
    title: "ReadableStream",
    url: "https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream",
    brand: "mdnwebdocs",
    excerpt: "A ReadableStream can be consumed with a reader, reading one chunk at a time until done is true.",
  },
  {
    title: "Why does my streamed response arrive all at once behind nginx?",
    url: "https://stackoverflow.com/questions/77412093/streamed-response-arrives-all-at-once-behind-nginx",
    brand: "stackoverflow",
    excerpt: "Proxy buffering holds the whole body. Send X-Accel-Buffering: no, or turn proxy_buffering off for that route.",
  },
  {
    title: "Streaming stops after 10 seconds on the Hobby plan",
    url: "https://github.com/vercel/next.js/discussions/61892",
    brand: "github",
    excerpt: "The function times out mid-stream; raise maxDuration on the route, up to your plan's limit.",
  },
];

export function SourcesPreview() {
  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <h2 className={styles.label}>Answer with citations</h2>
        <Sources sources={SOURCES}>
          <div className={own.answer}>
            <p className={own.prompt}>How do I stream an LLM’s answer in a Next.js app?</p>
            <p>
              Return a ReadableStream from a Route Handler and Next.js sends each chunk to the browser as soon as it’s
              ready
              <Citation n={1} />. On the client, read the response body with a reader and append each chunk to the
              message until the stream reports it’s done
              <Citation n={2} />.
            </p>
            <p>
              If the whole answer still lands at once, a proxy is buffering it: send X-Accel-Buffering: no from the
              route
              <Citation n={3} />. If it stops partway, the function hit its time limit; raise maxDuration on that
              route
              <Citation n={4} />
              <Citation n={1} />.
            </p>
            <SourceList />
          </div>
        </Sources>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>As a row of chips</h2>
        <Sources sources={SOURCES}>
          <div className={own.answer}>
            <p>
              Stream from a Route Handler
              <Citation n={1} />, and turn off proxy buffering if it arrives all at once
              <Citation n={3} />.
            </p>
            <SourceList variant="row" />
          </div>
        </Sources>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>List opened</h2>
        <div className={styles.measure}>
          <Sources sources={SOURCES}>
            <SourceList defaultOpen />
          </Sources>
        </div>
      </section>
    </div>
  );
}

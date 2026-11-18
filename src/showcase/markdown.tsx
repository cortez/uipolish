"use client";

import { Markdown } from "@registry/markdown/markdown";
import styles from "./showcase.module.css";

const SOURCE = `**Saturday supper** for 8 guests:

1. Burrata with *blood orange*
2. Slow-roast lamb, white beans
3. Olive oil cake

Buy \`2 kg\` of lamb. Two guests are [vegetarian](https://example.com/guests).`;

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <Markdown source={SOURCE} />
    </div>
  );
}

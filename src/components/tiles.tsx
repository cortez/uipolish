import Link from "@/components/link";
import styles from "./tiles.module.css";

export type Tile = { name: string; title: string; summary: string; type?: "block" | "template" };

/** A summary's opening phrase (before its colon or first full stop), so the
 *  cards stay even; the docs page has the whole summary. */
function lead(summary: string) {
  const end = summary.search(/[:.](\s|$)/);
  return (end === -1 ? summary : summary.slice(0, end)).trim() + ".";
}

/** Cards linking to each item's docs page: its title and what it covers. */
export function Tiles({ items, className }: { items: Tile[]; className?: string }) {
  return (
    <ul className={className ? `${styles.tiles} ${className}` : styles.tiles}>
      {items.map((b) => (
        <li key={b.name}>
          <Link href={`/docs/${b.name}`} className={styles.tile}>
            <span className={styles.head}>
              <span className={styles.title}>
                {b.title}
                <span className={styles.arrow} aria-hidden="true">
                  →
                </span>
              </span>
            </span>
            <span className={styles.summary}>{lead(b.summary)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

"use client";

import { Avatar, AvatarGroup } from "@registry/avatar/avatar";
import base from "./preview.module.css";
import styles from "./avatar.module.css";

const GOING = [
  { name: "Maya Chen", src: "/avatars/maya-chen.jpg" },
  { name: "Priya Natarajan" },
  { name: "Theo Okafor", src: "/avatars/theo-okafor.jpg" },
  { name: "Lena Fischer" },
  { name: "Sam Ortiz" },
  { name: "Jules Moreau" },
  { name: "Arjun Mehta" },
];

const WAITLIST = [{ name: "Noor Haddad" }, {}, { name: "Ines Duarte" }];

const NAMES = ["Maya Chen", "Priya Natarajan", "Theo Okafor", "Lena Fischer", "Sam Ortiz", "王小明", "noor@example.com"];

export function AvatarPreview() {
  return (
    <div className={base.stack}>
      <section className={base.group}>
        <h2 className={base.heading}>Who’s coming</h2>
        <div className={styles.going}>
          <AvatarGroup people={GOING} label="Going" max={5} size={32} />
          <p className={styles.goingText}>Maya, Priya and 5 others are going</p>
        </div>
        <div className={styles.going}>
          <AvatarGroup people={WAITLIST} total={24} label="Waitlist" max={4} size={24} />
          <p className={styles.goingText}>24 on the waitlist</p>
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Sizes: 20, 24, 32, 40</h2>
        <div className={base.row}>
          {([20, 24, 32, 40] as const).map((size) => (
            <Avatar key={size} name="Priya Natarajan" size={size} />
          ))}
        </div>
        <div className={base.row}>
          {([20, 24, 32, 40] as const).map((size) => (
            <Avatar key={size} size={size} />
          ))}
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Initials, and no name at all</h2>
        <div className={base.row}>
          {NAMES.map((name) => (
            <Avatar key={name} name={name} size={40} />
          ))}
          <Avatar size={40} />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Beside the name: a photo, and a photo that didn’t load</h2>
        <div className={styles.people}>
          <div className={styles.person}>
            <Avatar name="Theo Okafor" src="/avatars/theo-okafor.jpg" decorative />
            <span>Theo Okafor</span>
          </div>
          <div className={styles.person}>
            <Avatar name="Lena Fischer" src="/avatars/lena-fischer-missing.jpg" decorative />
            <span>Lena Fischer</span>
          </div>
        </div>
      </section>
    </div>
  );
}

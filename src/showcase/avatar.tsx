"use client";

import { Avatar, AvatarGroup } from "@registry/avatar/avatar";
import styles from "./showcase.module.css";

const GOING = [
  { name: "Maya Chen" },
  { name: "Priya Raman" },
  { name: "Tomás Ortega" },
  { name: "Ines Laurent" },
  { name: "Sam Okafor" },
  { name: "Leo Brandt" },
  { name: "Hana Sato" },
];

export default function Showcase() {
  return (
    <div className={styles.row}>
      <Avatar name="Maya Chen" size={24} />
      <Avatar name="Priya Raman" size={32} />
      <Avatar name="Tomás Ortega" size={40} />
      <AvatarGroup people={GOING} label="Going" max={5} />
    </div>
  );
}

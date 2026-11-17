"use client";

import { PhoneInput } from "@registry/phone-input/phone-input";
import styles from "./showcase.module.css";

export default function Showcase() {
  return (
    <div className={styles.stack}>
      <PhoneInput label="Mobile" name="mobile" defaultCountry="GB" hint="Only for a text if the venue changes." />
    </div>
  );
}

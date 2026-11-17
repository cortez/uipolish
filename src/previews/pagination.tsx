"use client";

import { useState } from "react";
import { Pagination } from "@registry/pagination/pagination";
import base from "./preview.module.css";
import styles from "./pagination.module.css";

const FIRST = ["Maya", "Priya", "Dana", "Theo", "Ines", "Sam", "Noor", "Felix", "Ruth", "Kenji", "Lola", "Arun"];
const LAST = ["Chen", "Raman", "Whitfield", "Okafor", "Lindqvist", "Moreau", "Haddad", "Brandt", "Alvarez", "Sato"];
const SUPPERS = ["Saturday supper", "Harvest table", "Soup night", "Lemon tart club"];
const RSVPS = ["Going", "Going", "Maybe", "Going", "No reply", "Can’t make it"];

// 114 guests, so the last page is a short one.
const GUESTS = Array.from({ length: 114 }, (_, i) => ({
  name: `${FIRST[i % FIRST.length]} ${LAST[(i * 7 + Math.floor(i / FIRST.length)) % LAST.length]}`,
  supper: SUPPERS[(i * 5) % SUPPERS.length],
  rsvp: RSVPS[(i * 3 + Math.floor(i / 4)) % RSVPS.length],
}));

const PER_PAGE = 6;

export function PaginationPreview() {
  const [page, setPage] = useState(1);
  const [logPage, setLogPage] = useState(1);
  const [linkPage, setLinkPage] = useState(2);
  const rows = GUESTS.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <div className={base.stack}>
      <section className={base.group}>
        <div className={styles.header}>
          <h2 className={base.heading}>Guest list</h2>
          <p className={base.note}>Everyone invited to an autumn supper</p>
        </div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">Guest</th>
              <th scope="col">Supper</th>
              <th scope="col">RSVP</th>
            </tr>
          </thead>
          <tbody>
            {/* The last page keeps six rows' height, so the control under
                the table stays put. */}
            {Array.from({ length: PER_PAGE }, (_, i) => rows[i]).map((guest, i) => (
              <tr key={i} aria-hidden={guest ? undefined : true}>
                <td>{guest?.name ?? " "}</td>
                <td>{guest?.supper}</td>
                <td>{guest?.rsvp}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination page={page} total={GUESTS.length} pageSize={PER_PAGE} onPageChange={setPage} aria-label="Guest list pages" />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>Compact</h2>
        <div className={styles.footer}>
          <p className={base.note}>RSVP log, newest first</p>
          <Pagination
            variant="compact"
            page={logPage}
            total={1240}
            pageSize={25}
            onPageChange={setLogPage}
            aria-label="RSVP log pages"
          />
        </div>
      </section>

      <section className={base.group}>
        <h2 className={base.label}>As links, few pages</h2>
        <Pagination
          page={linkPage}
          pageCount={4}
          href={(p) => `#menus-page-${p}`}
          onPageChange={setLinkPage}
          aria-label="Menu archive pages"
        />
      </section>

      <section className={base.group}>
        <h2 className={base.label}>One page</h2>
        <Pagination page={1} pageCount={1} aria-label="Waitlist pages" />
        <p className={base.note}>Both arrows are off, and stay in the tab order.</p>
      </section>
    </div>
  );
}

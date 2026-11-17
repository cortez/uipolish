"use client";

import { useState } from "react";
import { Pagination } from "@registry/pagination/pagination";
import styles from "./showcase.module.css";

export default function Showcase() {
  const [page, setPage] = useState(3);
  const [compact, setCompact] = useState(1);

  return (
    <div className={styles.wide}>
      <Pagination page={page} total={240} pageSize={25} onPageChange={setPage} />
      <Pagination variant="compact" page={compact} total={240} pageSize={25} onPageChange={setCompact} />
    </div>
  );
}

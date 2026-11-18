"use client";

import { useState } from "react";
import { Pagination } from "@registry/pagination/pagination";

export default function Showcase() {
  const [page, setPage] = useState(3);
  return <Pagination page={page} total={240} pageSize={25} onPageChange={setPage} />;
}

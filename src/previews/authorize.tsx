"use client";

import { useRef, useState } from "react";
import { Authorize, type AuthorizeScope, type AuthorizeStatus } from "@registry/authorize/authorize";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import { StarMark } from "@/components/logo";

const SCOPES: AuthorizeScope[] = [
  { id: "bookings:read", title: "See your bookings", access: "read", required: true },
  { id: "menus:read", title: "See menus and recipes", access: "read", required: true },
  { id: "lists:write", title: "Change shopping lists", access: "write" },
  { id: "messages:write", title: "Message your guests", access: "write" },
  { id: "refunds:write", title: "Issue refunds", access: "write", defaultGranted: false },
];

// Made-up logos for the made-up apps.
const COPPER = (
  <svg viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="9" fill="#c4683a" />
    <path d="M15.5 8.6a5 5 0 1 0 0 6.8" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" />
  </svg>
);

const ACME = (
  <StarMark />
);

const ACCOUNTS = ["mara@saturdaysupper.example.com", "mara.okafor@example.net"];

export function AuthorizePreview() {
  const [status, setStatus] = useState<AuthorizeStatus>("review");
  const [run, setRun] = useState(0);
  const [email, setEmail] = useState(ACCOUNTS[0]);
  const failedOnce = useRef(false);
  const timer = useRef(0);

  // The first Allow fails, like a token endpoint timing out; the second connects.
  function allow() {
    setStatus("submitting");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (!failedOnce.current) {
        failedOnce.current = true;
        setStatus("error");
        return;
      }
      setStatus("connected");
    }, 1400);
  }

  function again() {
    window.clearTimeout(timer.current);
    failedOnce.current = false;
    setStatus("review");
    setRun((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={styles.row} style={{ justifyContent: "space-between" }}>
          <h2 className={styles.label}>Copper connecting to Acme’s MCP server</h2>
          <Button variant="secondary" onClick={again}>
            Start over
          </Button>
        </div>
        <Authorize
          key={run}
          headingLevel={3}
          client={{ name: "Copper", returnTo: "localhost:33418", verified: true, mark: COPPER }}
          server={{ name: "Acme", mark: ACME }}
          account={{ email }}
          otherAccounts={ACCOUNTS}
          // A real page would sign in again for "Use another account" (no email).
          onSwitchAccount={(next) => next && setEmail(next)}
          scopes={SCOPES}
          status={status}
          error="Acme didn’t answer within 10 seconds. Nothing was shared; try again."
          onAllow={allow}
          onDeny={() => setStatus("denied")}
        />
        <p className={styles.note}>The first Allow fails on purpose, so you can see the error and retry.</p>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>An app the server doesn’t know, read-only</h2>
        <Authorize
          headingLevel={3}
          client={{ name: "pantry-sync", returnTo: "pantry-sync.example.net" }}
          server={{ name: "Acme", mark: ACME }}
          scopes={SCOPES.slice(0, 2)}
          onAllow={() => {}}
          onDeny={() => {}}
        />
      </section>
    </div>
  );
}

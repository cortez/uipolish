"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import {
  Pricing,
  type PricingFaq,
  type PricingFeatureGroup,
  type PricingPlan,
} from "@registry/pricing/pricing";
import { Button } from "@registry/button/button";
import { Checkbox } from "@registry/checkbox/checkbox";
import { Select } from "@registry/select/select";
import { Toaster } from "@registry/toast/toast";
import styles from "./preview.module.css";

const PLANS: PricingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For trying Acme on your own work.",
    price: { month: 0, year: 0 },
    usage: { included: 200, unit: "credits", atLimit: "Pauses at the limit until next month" },
    features: ["Acme Assistant on standard models", "3 projects", "128K-token context", "Community support"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For one person shipping with Acme every day.",
    price: { month: 20, year: 192 },
    usage: { included: 5000, unit: "credits", overage: { price: 4, per: 1000 } },
    includes: "free",
    featured: true,
    features: ["Acme Max and every frontier model", "Unlimited projects", "1M-token context", "3 background agents at a time", "Email support"],
  },
  {
    id: "team",
    name: "Team",
    description: "For teams that share agents, credits and context.",
    price: { month: 30, year: 288 },
    perSeat: true,
    usage: { included: 10000, unit: "credits", overage: { price: 3, per: 1000 } },
    includes: "pro",
    features: ["Shared workspaces and agents", "Credits pooled across the team", "Admin roles and spend limits", "SSO with Google and Okta", "Priority support"],
  },
];

const FEATURES: PricingFeatureGroup[] = [
  {
    title: "Usage",
    rows: [
      {
        label: "Monthly credits",
        hint: "A credit is about one short reply. Long tasks and larger models use more.",
        values: { free: "200", pro: "5,000", team: "10,000 per seat" },
      },
      {
        label: "More credits",
        hint: "Credits past your monthly amount, billed at the end of the month. Set a cap any time.",
        values: { free: false, pro: "$4 per 1,000", team: "$3 per 1,000" },
      },
      { label: "Projects", values: { free: "3", pro: "Unlimited", team: "Unlimited" } },
      { label: "Seats", values: { free: "1", pro: "1", team: "2 or more" } },
    ],
  },
  {
    title: "Models and agents",
    rows: [
      { label: "Standard models", values: { free: true, pro: true, team: true } },
      { label: "Acme Max", values: { free: false, pro: true, team: true } },
      {
        label: "Context window",
        hint: "How much the model can read at once. 1,000 tokens is about 750 words.",
        values: { free: "128K tokens", pro: "1M tokens", team: "1M tokens" },
      },
      {
        label: "Background agents",
        hint: "Agents that keep working on a task after you close the tab, and report back when done.",
        values: { free: false, pro: "3 at a time", team: "10 at a time" },
      },
    ],
  },
  {
    title: "Collaboration",
    rows: [
      { label: "Shared workspaces", values: { free: false, pro: false, team: true } },
      {
        label: "Pooled credits",
        hint: "Everyone draws from one balance, so a quiet seat’s credits aren’t wasted.",
        values: { free: false, pro: false, team: true },
      },
      { label: "Admin roles and spend limits", values: { free: false, pro: false, team: true } },
    ],
  },
  {
    title: "Security and support",
    rows: [
      {
        label: "Training on your data",
        hint: "Your prompts and files are never used to train models, on any plan.",
        values: { free: "Never", pro: "Never", team: "Never" },
      },
      { label: "Single sign-on", values: { free: false, pro: false, team: "Google and Okta" } },
      { label: "Support", values: { free: "Community", pro: "Email", team: "Priority, 1 business day" } },
    ],
  },
];

const FAQ: PricingFaq[] = [
  {
    question: "What’s a credit?",
    answer: (
      <p>
        One credit is about one short reply from a standard model. Longer tasks, bigger files and Acme Max use more, and
        every run shows what it cost before and after.
      </p>
    ),
  },
  {
    question: "What happens when I run out?",
    answer: (
      <p>
        On Free, Acme pauses until your credits reset next month. On Pro and Team you keep going at the rate on your
        plan, billed at the end of the month, up to a cap you set.
      </p>
    ),
  },
  {
    question: "Can I change plans later?",
    answer: (
      <p>
        Any time. An upgrade starts at once and is prorated; a downgrade starts at the end of the period you’ve paid
        for, and you keep everything you made.
      </p>
    ),
  },
  {
    question: "How do seats work on Team?",
    answer: (
      <p>
        You pay for each person who can sign in. Add seats whenever someone joins; remove one and the next invoice is
        lower.
      </p>
    ),
  },
  {
    question: "Do you train on my data?",
    answer: <p>No. Your prompts, files and outputs are never used to train models, on any plan.</p>,
  },
];

const CURRENT = [
  { value: "none", label: "Signed out" },
  { value: "free", label: "On Free" },
  { value: "pro", label: "On Pro" },
];

const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

export function PricingPreview() {
  const [current, setCurrent] = useState("none");
  const [failNext, setFailNext] = useState(false);
  const [run, setRun] = useState(0);
  const failRef = useRef(failNext);
  useEffect(() => {
    failRef.current = failNext;
  }, [failNext]);

  return (
    <div className={styles.stack}>
      <div className={styles.row} data-demo-controls="">
        <Select aria-label="Visitor" options={CURRENT} value={current} onValueChange={setCurrent} />
        <Checkbox label="Fail the next checkout" checked={failNext} onCheckedChange={setFailNext} />
        <Button
          variant="ghost"
          onClick={() => {
            setCurrent("none");
            setRun((r) => r + 1);
          }}
         data-demo-controls="">
          Start over
        </Button>
      </div>

      <div style={{ "--pricing-backdrop": "var(--ui-surface)" } as CSSProperties}>
        <Pricing
          key={run}
          headingLevel={2}
          title="Pick the plan that fits how you work"
          description="Start free. Upgrade when Acme becomes part of your day, and pay for extra credits only when you use them."
          plans={PLANS}
          features={FEATURES}
          faq={FAQ}
          enterprise={{
            description: "Custom credit pools, private deployment and a contract that fits your security review.",
            features: ["SAML SSO and SCIM", "Data kept in the EU or US", "Audit log export", "A named success manager"],
          }}
          contactHref="#contact-sales"
          currentPlanId={current === "none" ? undefined : current}
          onSelect={async (planId) => {
            // Stands in for creating a checkout session before you navigate to it.
            await wait(1100);
            if (failRef.current) {
              setFailNext(false);
              throw new Error("Checkout didn’t open. Nothing was charged; try again in a moment.");
            }
            setCurrent(planId);
          }}
        />
      </div>

      <p className={styles.note}>
        Choosing a plan waits about a second, like creating a checkout session, then makes it your current plan. Tick
        “Fail the next checkout” to see the error.
      </p>
      <Toaster />
    </div>
  );
}

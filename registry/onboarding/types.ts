import type { ReactNode } from "react";
import type { BrandName } from "../brand-marks/brand-marks";

/** The steps, in order. `done` is the screen after them, not a step. */
export type OnboardingStep = "about" | "tools" | "agent" | "first-task";
export type OnboardingView = OnboardingStep | "done";

/** Everything the person has told you so far. Kept across steps, and handed to `onChange` on every change so you can save it. */
export type OnboardingValues = {
  /** The workspace name. Required on the first step. */
  name: string;
  /** A `teamSizes` value. */
  teamSize: string;
  /** A `useCases` value. Required on the first step. */
  useCase: string;
  /** Tool id → the account it connected as ("mara@saturdaysupper.com"), or "" when your server didn't say. */
  connected: Record<string, string>;
  /** A `tones` value. */
  tone: string;
  /** Permission id → allowed without asking. */
  permissions: Record<string, boolean>;
  /** What the agent wrote on the first-task step; "" until it has. */
  draft: string;
};

export type OnboardingChoice = {
  value: string;
  label: string;
  /** Cards only: one line under the label. */
  description?: string;
};

export type OnboardingScope = {
  /** What it lets the agent do, starting with the verb: "See your events". */
  title: string;
  access: "read" | "write";
};

export type OnboardingTool = {
  id: string;
  name: string;
  /** The service's mark from `brand-marks`. */
  brand?: BrandName;
  /** Your own mark, for a service without a brand. Drawn at 20px. */
  mark?: ReactNode;
  /** What the agent does with it, in a line: "Holds dates and spots clashes". */
  description: string;
  /** Who the person signs in with, in "Continue to Google". Defaults to `name`. */
  provider?: string;
  /** What the agent asks for, shown before the person leaves for the provider. */
  scopes: OnboardingScope[];
};

export type OnboardingPermission = {
  id: string;
  /** What the agent may do, starting with the verb: "Send reminders to confirmed guests". */
  title: string;
  /** What that means in practice, in a line. */
  description: string;
  /** On until the person turns it off. */
  defaultOn?: boolean;
  /** A tool id this needs. Until that tool is connected the switch is off and disabled, with a way back to connect it. */
  requires?: string;
};

export type OnboardingTone = {
  value: string;
  label: string;
  /** How the agent would answer a guest in this tone: shown as a sample under the choice. */
  sample: string;
};

/** What your server says about a connection. A rejected promise counts as `{ ok: false }`. */
export type OnboardingConnectResult =
  | { ok: true; /** The account it connected as. */ account?: string }
  | {
      ok: false;
      /** `cancelled`: the person closed the provider's window; nothing is shown. */
      reason?: "cancelled" | "error";
      /** What went wrong and what to do, in place of the default. */
      message?: string;
    };

/** Handed to `onFirstTask`: write the agent's output as it arrives. */
export type OnboardingTaskRun = {
  values: OnboardingValues;
  /** Append text to the draft. Ignored once the run is aborted. */
  write: (chunk: string) => void;
  /** Aborted when the person leaves the step, skips, or asks for a new draft. */
  signal: AbortSignal;
};

export type OnboardingFirstTask = {
  /** What the agent is making: "Invite for Saturday supper". */
  title: string;
  /** The facts it's working from, short: "Sat, Nov 15 · 7:30 pm · 12 seats". */
  detail?: string;
};

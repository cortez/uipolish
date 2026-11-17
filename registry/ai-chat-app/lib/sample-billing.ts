import type {
  BillingInvoice,
  BillingPaymentMethod,
  BillingPlan,
  BillingSubscription,
} from "@/components/ui/billing/billing";
import type { TeamInvite, TeamMember } from "@/components/ui/team-members/team-members";
import type { User } from "@/lib/auth";

/* Sample billing and team data for Settings, so the page is whole before
   it's connected. Replace each function with your source: the plan,
   card and invoices from Stripe (or Polar, Paddle, Lemon Squeezy), the
   members and invites from your database. Usage is already real
   (lib/usage.ts). */

export const PLANS: BillingPlan[] = [
  {
    id: "free",
    name: "Free",
    description: "For trying it out on your own.",
    price: { month: 0, year: 0 },
    perSeat: false,
    features: ["100 messages a day", "Every model", "Chat history"],
  },
  {
    id: "pro",
    name: "Pro",
    description: "For a team that uses it every day.",
    price: { month: 20, year: 200 },
    features: ["1,000 messages a day per seat", "Every model", "Chat history", "Shared workspaces", "Priority support"],
  },
];

export function subscription(): BillingSubscription {
  const start = new Date();
  start.setUTCDate(1);
  const end = new Date(start);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const iso = (d: Date) => d.toISOString().slice(0, 10);
  return { planId: "pro", interval: "month", status: "active", seats: 5, seatsUsed: 3, periodStart: iso(start), periodEnd: iso(end) };
}

export const PAYMENT_METHOD: BillingPaymentMethod = { brand: "Visa", last4: "4242", expMonth: 8, expYear: 2028 };

export function invoices(): BillingInvoice[] {
  return [1, 2, 3].map((monthsAgo) => {
    const d = new Date();
    d.setUTCDate(1);
    d.setUTCMonth(d.getUTCMonth() - monthsAgo + 1);
    const date = d.toISOString().slice(0, 10);
    return { id: `inv-${date}`, number: `ACME-${date.replaceAll("-", "").slice(0, 6)}`, date, amount: 60, status: "paid" as const };
  });
}

export function team(user: User): { members: TeamMember[]; invites: TeamInvite[] } {
  const day = 24 * 60 * 60 * 1000;
  return {
    members: [
      { id: user.id, name: user.name, email: user.email, role: "owner", lastActiveAt: Date.now() },
      { id: "m-priya", name: "Priya Raman", email: "priya@acme.example.com", role: "admin", lastActiveAt: Date.now() - 2 * 60 * 60 * 1000 },
      { id: "m-tom", name: "Tom Becker", email: "tom@acme.example.com", role: "member", lastActiveAt: Date.now() - 3 * day },
    ],
    invites: [{ id: "i-dana", email: "dana@acme.example.com", role: "member", sentAt: Date.now() - day, expiresAt: Date.now() + 6 * day, invitedBy: user.name }],
  };
}

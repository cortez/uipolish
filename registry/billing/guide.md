# Billing

The billing settings page of a SaaS product. It shows the current plan and
the card it's charged to, usage meters for metered limits, the plans on offer
with a monthly/yearly switch, billing details, invoices and a way to cancel.
Every action waits on your own async callback, shows busy while it runs, and
says what went wrong if it fails.

Each subscription state changes the whole screen, not just a badge. A trial
shows the days left. Past due shows a red banner with the grace period and
**Update payment method**. A plan that's canceled shows when access ends and
offers **Keep subscription**; once it has ended, **Resubscribe**. If the
subscription needs something done, the banner at the top says what.

```tsx
<Billing
  subscription={subscription} // { planId, interval, status, seats, periodStart, periodEnd, … }
  plans={plans}               // cheapest first
  usage={usage}               // [{ id, label, used, limit, resetsAt, atLimit }]
  paymentMethod={card}        // { brand, last4, expMonth, expYear, failure? } or null
  invoices={invoices}
  details={details}
  currency="USD"
  onChangePlan={(planId, interval) => api.post("/billing/plan", { planId, interval }).then(refresh)}
  onUpdatePayment={() => stripe.openCardForm().then(refresh)}
  onSaveDetails={(next) => api.put("/billing/details", next).then(refresh)}
  onCancel={(reason, note) => api.post("/billing/cancel", { reason, note }).then(refresh)}
  onResume={() => api.post("/billing/resume").then(refresh)}
/>
```

## When to use it

- The billing page of a product that charges per seat or a flat price per
  month or year, with optional metered limits (AI credits, messages,
  storage).
- As the page itself, or with sections cut away: leave out `usage`,
  `invoices`, `details` or `paymentMethod` and that part goes.

## When not to

- Checkout for a first purchase. That's a focused flow with one plan and a
  card form, not a settings page.
- Usage analytics: charts over time, cost per project. Link to them from
  here; the meters only answer "how close am I to the limit".
- The card form itself. `onUpdatePayment` should open your processor's form
  or portal (Stripe Elements, a hosted page) rather than collect card
  numbers here.

## States

| State | What shows |
|---|---|
| Active | Plan card with the renewal date, Billed and Seats; card with "Charged on …" |
| Trial (`trialing`) | "9 days left in your Acme Team trial" (info). With no card, it says to add one before the end date and offers **Add payment method**, and turns to a warning from 3 days out. Plan changes start now and nothing is charged until the trial ends |
| Past due (`past_due`) | Red banner: "Your $120 payment didn't go through", the processor's reason, the next retry and "Update your card by November 10 to keep Acme Team." Plan buttons are off with "Plans can change once the open invoice is paid." |
| Canceled, access left | Warning banner "Acme Team ends on November 14", **Keep subscription** (`onResume`). Plan buttons are off until it's kept |
| Canceled, ended | Info banner "Acme Team ended on October 14", **Resubscribe to Acme Team**; the plans section becomes "Choose a plan" |
| Downgrade scheduled | A note in the plan card: "Switches to Acme Starter on November 14, 2026." with **Keep Acme Team** |
| Card expiring | "Expires soon" badge within the card's last two months, and "Update it before …, when the next charge runs." Expired: "Expired" badge and danger text |
| Card failed | `paymentMethod.failure` in danger text and a "Payment failed" badge; the update button turns primary |
| No card | "No card on file" and **Add payment method** |
| Usage under 80% | A neutral bar: "2,580 left. Resets Nov 14." |
| Usage 80% and over | Amber bar and line: "88 texts left until Nov 14. At the limit, reminders go by email only." |
| Usage at 100% | Red bar: "**All 10,000 credits used.** Copper stops drafting menus and replies until then. Resets Nov 14." and **Compare plans**, which scrolls to the plans and moves focus there |
| Unlimited (`limit: null`) | No bar: "Unlimited on your plan." |
| No invoices | "No invoices yet. Your first one arrives on November 12, 2026, when the trial ends." |
| Many invoices | The newest 6, then "Show 9 older invoices" |
| Read only (`readOnly`) | An info banner with your reason ("Ask Mara Okafor"); every action is hidden except invoice downloads |
| Loading | The title, and "Loading billing…" shimmering in a card the height of the plan cards |
| Didn't load (`error`) | An empty state with the error and **Try again** (`onRetry`) |
| An action is pending | Its button keeps its width and shimmers its busy label ("Changing plan…", "Opening…", "Saving…", "Canceling…") after 300ms |
| An action failed | The rejection's message, next to where it was pressed: in the dialog footer, under the form, in the banner or card |

## Changing plans

`plans` is in order, cheapest first, and the order decides what's an
upgrade. The monthly/yearly switch shows each plan's price for that period
as a monthly figure ("$15 per seat / month") with the total for the
subscription's seats under it. "Save 17%" is the largest yearly saving
across the plans, worked out from `price.month * 12` against `price.year`.

| Choice | Dialog | Takes effect |
|---|---|---|
| A higher plan, or yearly on the same plan | "Upgrade to Acme Business", confirmed with **Upgrade now**: due today, renewal date, the card, and what it adds | Now, prorated |
| A lower plan, or monthly on the same plan | "Switch to Acme Starter on Nov 14?": what the team loses, in a warning box | End of the period |
| Any plan during a trial | "Switch to …": the trial end date and the new price | Now, nothing charged |
| Any plan after the subscription ended | "Subscribe to …": full price today, renewal date | Now |

**Due today** is an estimate. For the same interval it's the difference in
price times the days left over the days in the period. For a switch to
yearly it's a full year less the unused part of this period. The dialog
says the invoice has the exact amount. If your processor can preview
proration, its number is better: put it in the plan's `description` or fork
`DialogBody` in `plans.tsx`.

What's lost is every line of the current plan's `features` that the new
plan doesn't have, word for word. Write features so that a lower tier's line
differs ("2,000 AI credits a month" against "10,000 AI credits a month"), and
the downgrade lists exactly what goes.

## Props

| Prop | What it does |
|---|---|
| `subscription` | `{ planId, interval, status, seats, seatsUsed?, periodStart, periodEnd, trialEnd?, cancelAt?, amountDue?, nextRetry?, graceUntil?, scheduledChange? }`. Dates are ISO (`"2026-11-14"`). `status` is `"trialing"`, `"active"`, `"past_due"` or `"canceled"` |
| `plans` | `{ id, name, description?, price: { month, year }, perSeat?, features }[]`, cheapest first. `price.year` is a whole year. `perSeat` defaults to true |
| `usage` | `{ id, label, used, limit, unit?, resetsAt?, atLimit? }[]`. `limit: null` is unlimited. `atLimit` is a sentence on what stops |
| `paymentMethod` | `{ brand, last4, expMonth, expYear, failure? }`, or `null` for no card. Leave out to drop the card |
| `invoices` | `{ id, number, date, amount, status, href? }[]`, newest first. `status` is `"paid"`, `"open"`, `"failed"` or `"refunded"`. No `href` shows "Preparing…" |
| `details` | `{ name, email, taxId?, address: { line1, line2?, city, region?, postalCode, country } }` |
| `onChangePlan(planId, interval)` | From the plan dialog, and from **Keep** on a scheduled switch (with the current plan and interval: undo the switch) |
| `onUpdatePayment()` | Open the card form or portal. Resolve once `paymentMethod` is the new card |
| `onSaveDetails(details)` | The whole edited value, trimmed, empty optionals as `undefined` |
| `onCancel(reason, note?)` | `reason` is `"price"`, `"unused"`, `"features"`, `"switching"`, `"seasonal"` or `"other"` |
| `onResume()` | Undo a cancel, or resubscribe to the same plan after it ended |
| `loading`, `error`, `onRetry` | Whole-screen loading and failure |
| `readOnly` | A sentence on why and who can change it. Hides every action |
| `cancelNotes` | Lines for the cancel dialog's "On Nov 14" box, after "All 8 seats lose access" |
| `currency`, `locale` | Default `"USD"`, `"en-US"`. Money goes through `Intl.NumberFormat`; whole amounts drop the cents |
| `today` | ISO date for days left, expiry and proration. Default: now. Pass it from the server to keep server and browser in step |
| `title`, `description`, `headingLevel` | Default "Billing", none, 1. Sections are one level down, plan names two |

Every callback can return a promise. The block shows busy until it settles
and shows the rejection's message if it fails. It never changes data itself:
resolve after your state reflects the change, and the screen follows from
the props.

## Customizing

- **Plan names and features** come from your pricing page. Keep features
  short and parallel across tiers; they double as the downgrade's loss
  list.
- **`atLimit`** on each meter is your product's real consequence ("Copper
  stops drafting menus and replies until then."), not "Limit exceeded".
- **`cancelNotes`**: say what stops and what's kept, and for how long.
- **The cancel reasons** are in `REASONS` in `billing.tsx`. Keep them to six
  or fewer, in your customers' words.
- **The grace period and retry** wording comes from `graceUntil` and
  `nextRetry`; leave them out if your processor doesn't retry.
- **Spacing** reads the shared roles: `--ui-gap-section` between
  sections (48 narrow, 56 from 600px), `--ui-gap-block` between cards,
  `--ui-gap-group` under a section's heading, and `--ui-pad-card` inside
  every card.
- **Widths**: the cards sit side by side once the block is 720px wide (so
  the payment card fits its button), and
  invoices fold into two-line rows at 520px. Both are container queries, so
  the block lays out right in a narrow settings column.
- **Edges**: every card's outline is the field edge color (`--ui-edge`, in
  `--ui-shadow-resting`), so the cards and the buttons in them read as one
  set; lines inside a card are the lighter `--ui-border`. The plan you're on
  takes the selected edge (`--ui-field-focus`), still one hairline.

## Accessibility

- One heading at `headingLevel`, each section a `<section>` named by its
  heading, plan names one level further down.
- Usage bars are `role="meter"` with "7,420 of 10,000 credits used" as their
  value text, named by the label and described by the line under them.
- The billing period switch is a radio group named "Billing period". The
  plans are a list named by the section heading, each item named by its
  plan.
- The invoices are a real `<table>` with column headers; the download
  column's header is visually hidden. Each link reads "Download invoice
  LRD-2026-0140, October 14, 2026, PDF". On a phone, the header row is
  visually hidden but stays readable.
- A polite `role="status"` region announces each change once it lands:
  "Acme Business, billed monthly, starts now.", "Billing details saved.",
  "Subscription canceled. You keep Acme Team until November 14, 2026."
- Banners use the Alert component and are there from the start, so they're
  read in page order, not interrupting. A change that makes one appear, like
  canceling, is announced in the status region instead.
- The plan dialog takes focus on its first button. The cancel dialog is an
  alert dialog with focus on **Keep subscription**, so the safe choice is
  the default. After a cancel, the button that opened it is gone, and focus
  goes to the page title. Typing a note and then pressing Escape asks
  before throwing it away.
- Editing details moves focus to the first field. Escape or Cancel brings
  it back to **Edit details**. Validation runs on blur and on save, focuses
  the first wrong field, and says how to fix it.
- **Compare plans** scrolls to the plans (no smooth scroll under reduced
  motion) and moves focus to their heading.
- Buttons are the standard 40px; download links reach 40px under a finger.

## Before / after

Before: a status string, a price, and a button that goes to the
processor's portal for everything else. Nobody knows the credits are about
to run out until Copper stops.

```tsx
<div>
  <h1>Billing</h1>
  <p>Plan: team ({sub.status})</p>
  <p>${sub.amount / 100}/mo</p>
  <a href={portalUrl}>Manage billing</a>
</div>
```

After: the plan, its price and renewal in words; a meter that warns at 80%
and says what to do at 100%; plan changes that state the charge today and
what a downgrade loses; and a banner whenever something needs doing.

```tsx
<Billing
  subscription={sub}
  plans={plans}
  usage={usage}
  paymentMethod={card}
  invoices={invoices}
  details={details}
  onChangePlan={changePlan}
  onUpdatePayment={openCardForm}
  onSaveDetails={saveDetails}
  onCancel={cancel}
  onResume={resume}
/>
```

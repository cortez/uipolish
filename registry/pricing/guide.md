# Pricing

The public pricing page of an AI SaaS product. A monthly/yearly switch with
the yearly saving said once, quietly, in the switch; a card per plan whose
price rolls between the two figures without moving anything around it;
what's included, what credits cost past the limit, and what each tier adds
to the one before. Under the plans: an optional Enterprise row, a full
comparison table with a header that sticks while you read it, and questions
in an accordion.

Choosing a plan waits on your own async callback. The button pressed shows
busy while it runs, and if it fails, says what went wrong next to it.

```tsx
<Pricing
  title="Pick the plan that fits how you work"
  description="Start free. Upgrade when Acme becomes part of your day."
  plans={plans}          // cheapest first; one may be `featured`
  features={groups}      // [{ title, rows: [{ label, hint?, values: { free, pro, team } }] }]
  faq={faq}              // [{ question, answer }]
  enterprise={{ description: "Custom credit pools and private deployment.", features: ["SAML SSO and SCIM"] }}
  contactHref="/contact"
  currentPlanId={workspace?.planId}
  onSelect={(planId, interval) => startCheckout(planId, interval).then((url) => router.push(url))}
/>
```

## When to use it

- The pricing page of a product with a free tier, a paid tier or two and a
  per-seat team plan, priced per month or per year, with usage on top
  (credits, messages, minutes).
- As the whole page, or cut down: leave out `features`, `faq` or
  `enterprise` and that part goes.

## When not to

- Changing plans once someone is paying. That needs proration, what a
  downgrade loses and the card it's charged to: use **Billing**.
- One price and nothing to compare. A sentence and a button say it better.
- More than four plans. Past that nobody compares; split by audience
  (individuals, teams) on two pages instead.

## States

| State | What shows |
|---|---|
| Monthly | Each card's price per month, "Billed monthly" under it |
| Yearly | The price per month when paid yearly, and the year's total: "$192, billed yearly", "$288 per seat, billed yearly". The switch reads "Yearly Save 20%", the largest saving across the plans |
| Free plan | "$0 / month", "Free forever" on both periods; the button reads "Start for free" |
| Featured | A "Most popular" badge (or `badge`) beside the name, the selected edge and the raised shadow, the primary button and checks in the text color. No glow, gradient or color: in dark, where nothing has a shadow, the card lifts a step (`--ui-fill-solid`) and the edge carries it |
| Signed in (`currentPlanId`) | "Current plan" with a check, in place of that plan's button, on the card and in the table header. It holds the button's height, so the rows still line up |
| Choosing | The pressed button keeps its label and width and shimmers after 300ms; the other plan buttons wait until it settles |
| Choice failed | The rejection's message in red under the card's button, read out at once. From the table's sticky header, it goes to a toast instead |
| No `onSelect` | No plan buttons at all, rather than buttons that do nothing: a page that only informs. To link to sign-up, navigate in `onSelect` |
| Usage with overage | "**5,000** credits a month / then $4 per 1,000 credits", on a row of the card between two hairlines, not a box inside it |
| Usage that stops | "200 credits a month / Pauses at the limit until next month" (`atLimit`) |
| Wide (760px and up) | Each card's name, pitch, price, button, usage and features share rows with the other cards (subgrid), so every one lines up across the row. The Enterprise row sits on the same columns: its name, pitch and button under the first plan, its list under the rest |
| Narrow (under 760px) | The cards stack in one column capped at 440px, so the full-width button is never wider than a card; the Enterprise row stacks too, its button full width like the plans' |
| Phone (under 640px) | The table shows one plan at a time, picked in a segmented control that sticks above it. Values align to the end; nothing scrolls sideways |

## Prices that change in place

The figures on a card never animate their width or position. Both the
monthly and the yearly figure are rendered, one character per cell, so each
cell is as wide as its wider character and the figure holds its box. Only
the characters that differ move: going to yearly they roll up, going back
they roll down, one after another, on the glide spring (`--ui-dur-glide`,
`--ui-ease-glide`), the leaving digit fading on `--ui-dur-instant` before
the arriving one fades in. The "billed" line crossfades the same way. Nothing
moves on first paint, and under reduced motion the figures only crossfade.

Prices use tabular figures, so $16 and $20 are the same width.

## Props

| Prop | What it does |
|---|---|
| `plans` | `{ id, name, description?, price: { month, year }, perSeat?, usage?, includes?, features, featured?, badge?, cta? }[]`, cheapest first. `price.year` is a whole year, paid up front |
| `plans[].usage` | `{ included, unit, overage?: { price, per }, atLimit? }`. "10,000 credits a month, then $3 per 1,000 credits" |
| `plans[].includes` | Another plan's id: the list opens with "Everything in Pro, plus", so each tier lists only what it adds |
| `features` | `{ title, rows: { label, hint?, values }[] }[]`. `values` by plan id: `true` a check, `false` or missing a dash, a string as written. `hint` is one sentence in a tooltip beside the label |
| `faq` | `{ question, answer }[]`. `answer` is any node; wrap paragraphs in `<p>` |
| `enterprise` | `{ name?, description, features?, cta? }`. Its button links to `contactHref` |
| `contactHref` | Where "Talk to us" goes, in the Enterprise row and beside the questions |
| `onSelect(planId, interval)` | A plan's button was pressed. Return a promise to show busy; reject with an `Error` whose message says what happened and what to do |
| `currentPlanId` | The signed-in workspace's plan |
| `defaultInterval` | `"month"` or `"year"`. Default `"month"` |
| `interval`, `onIntervalChange` | Control the period yourself, e.g. to keep it in the URL |
| `currency`, `locale` | Default `"USD"`, `"en-US"`. Money goes through `Intl.NumberFormat`; whole amounts drop the cents |
| `title`, `description`, `headingLevel` | Default "Pricing", none, 2. Plan names and sections are one level down, questions two |

## Customizing

- **The sticky header** sits under `--pricing-sticky-top` (default `0px`).
  Set it to your site header's height if that header is sticky too.
- **The phone picker** is opaque so rows pass under it: set
  `--pricing-backdrop` to the color the section sits on (default
  `--ui-canvas`).
- **Plan copy**: one line of `description` on who it's for, five or six
  `features`, each a gain over the tier before. Keep the comparison rows
  parallel ("3 at a time", "10 at a time") so a column reads down.
- **The saving** is worked out from `price.month * 12` against `price.year`;
  the switch shows the largest one, rounded.
- **One inset** (`--pricing-inset`, default `--ui-pad-card`: 16 in a
  narrow section, 24 from 560px) pads the plans,
  the Enterprise row, the table and the questions alike, so text and rules
  start the same distance from every card's edge.
- **Widths** are container queries on the section: three columns from 760px,
  the one-plan table under 640px. It lays out right in any frame.

## Accessibility

- One heading at `headingLevel`. The plans are a list named by it, each
  card named by its plan; the comparison and the questions are sections
  named by their headings.
- The period switch is a radio group named "Billing period". The phone
  picker is a radio group named "Plan to show".
- The rolling figure is `aria-hidden`; a screen reader hears the shown price
  once, in words ("$16 a month", "$24 per seat per month"). The billed line's
  hidden wording is `aria-hidden` too.
- The table is a real `<table>` with a caption, plan columns (`scope="col"`),
  group rows (`scope="colgroup"`) and feature rows (`scope="row"`). Checks and
  dashes read "Included" and "Not included". On a phone the header row is
  visually hidden but stays in the table.
- Term hints are buttons named "About Context window", 24px to a mouse and
  40px to a finger, and describe themselves with the tooltip. They only
  repeat: nothing you need to choose lives in a tooltip.
- A failed choice is a `role="alert"` linked to its button with
  `aria-describedby`. Busy buttons keep focus and ignore presses.

## Before / after

Before: three boxes of bullets, a price that jumps width when the period
changes, and a table that scrolls sideways on a phone.

```tsx
<div className="grid grid-cols-3">
  {plans.map((p) => (
    <div key={p.id}>
      <h3>{p.name}</h3>
      <p>${yearly ? p.year / 12 : p.month}/mo</p>
      <a href={`/checkout?plan=${p.id}`}>Buy</a>
    </div>
  ))}
</div>
```

After: one featured plan, prices that roll in place, usage in words, the
current plan marked, a comparison that fits any width, and a checkout that
says when it didn't open.

```tsx
<Pricing plans={plans} features={groups} faq={faq} currentPlanId={planId} onSelect={startCheckout} />
```

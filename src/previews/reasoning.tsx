"use client";

import { useEffect, useRef, useState } from "react";
import { Reasoning } from "@registry/reasoning/reasoning";
import { Button } from "@registry/button/button";
import styles from "./preview.module.css";
import own from "./reasoning.module.css";

const REASONING = `Fourteen guests, one main course, two sides, bread and dessert. Two of them are vegetarian and one of the others is a child, so the main needs 11.5 adult portions, plus a vegetarian main for two.

Salmon fillets at about 180 g raw per adult: 11 × 180 g is 1.98 kg, plus half a portion for the child, so roughly 2.1 kg. Buying 2.3 kg leaves room for trimming.

For the vegetarian main, a mushroom and leek galette sized for four covers the two guests and lets others try it.

Sides: roast potatoes at 200 g each comes to 2.8 kg; round to 3 kg because they're always the first thing gone. Green salad, about 60 g of leaves a person, so 850 g, call it four large bags.

Bread: two sourdough loaves cut into 16 slices each is 32 slices, a bit over two per person. Dessert: one lemon tart serves 10, so two tarts.

Drinks: assume half a bottle of wine per adult who drinks, about 10 adults, so 5 bottles, and 4 litres of sparkling water.`;

// One headline per paragraph of REASONING: what the model is doing while it
// writes that paragraph. The label rises from one to the next.
const STEPS = [
  "Counting guests and portions",
  "Working out the salmon",
  "Choosing a vegetarian main",
  "Sizing the sides",
  "Bread and dessert",
  "Adding the drinks",
];

const stepsFor = (text: string) => STEPS.slice(0, Math.max(1, text.split(/\n{2,}/).filter((p) => p.trim()).length));

const ANSWER =
  "For 14 guests, buy 2.3 kg of salmon, one mushroom and leek galette, 3 kg of potatoes, four bags of salad, two sourdough loaves, two lemon tarts, five bottles of wine and 4 litres of sparkling water.";

const STATIC_REASONING = `The plan for Saturday supper still counts 12 guests. Two more said yes this morning, so the lamb goes from 2.4 kg to 2.8 kg and the shopping list moves from $212 to $236.

Bread and dessert stay the same: two loaves and two tarts already cover 14. The wine was added after the menu went out, so it stays as a separate line.

The new total is $236 before tax. I'll mention the two extra guests in the note to Maya so the change isn't a surprise.`;

export function ReasoningPreview() {
  const [run, setRun] = useState(0);
  const [text, setText] = useState("");
  const [streaming, setStreaming] = useState(true);
  const [answer, setAnswer] = useState(false);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const words = REASONING.split(/(\s+)/);
    let i = 0;
    let out = "";
    const clear = () => timers.current.forEach(clearTimeout);
    const later = (fn: () => void, ms: number) => timers.current.push(window.setTimeout(fn, ms));

    // A first beat of silence, like a model that hasn't produced text yet.
    function step() {
      if (i >= words.length) {
        later(() => {
          setStreaming(false);
          setAnswer(true);
        }, 500);
        return;
      }
      // Two to four words per chunk, at a slightly uneven pace.
      const take = 2 + (i % 3);
      out += words.slice(i, i + take * 2).join("");
      i += take * 2;
      setText(out);
      later(step, 70 + ((i * 37) % 60));
    }
    later(step, 900);
    return clear;
  }, [run]);

  function again() {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setText("");
    setAnswer(false);
    setStreaming(true);
    setRun((r) => r + 1);
  }

  return (
    <div className={styles.stack}>
      <section className={styles.group}>
        <div className={own.head}>
          <h2 className={styles.label}>While thinking, then done</h2>
          <Button variant="secondary" onClick={again} data-demo-controls="">
            Run again
          </Button>
        </div>
        {/* The live exchange shares one cell with invisible copies of its
            tallest moments (thinking at full height, and done with the
            answer), so nothing below moves while it plays. */}
        <div className={own.reserve}>
          <div className={`${own.message} ${own.ghost}`} aria-hidden="true" inert>
            <p className={own.prompt}>How much food should I buy for a dinner for 14 guests?</p>
            <Reasoning streaming>{REASONING}</Reasoning>
          </div>
          <div className={`${own.message} ${own.ghost}`} aria-hidden="true" inert>
            <p className={own.prompt}>How much food should I buy for a dinner for 14 guests?</p>
            <Reasoning streaming={false} duration={8}>
              {REASONING}
            </Reasoning>
            <p className={own.answer}>{ANSWER}</p>
          </div>
          <div className={own.message}>
            <p className={own.prompt}>How much food should I buy for a dinner for 14 guests?</p>
            <Reasoning key={run} streaming={streaming} steps={text ? stepsFor(text) : undefined}>
              {text}
            </Reasoning>
            <p className={own.answer} data-shown={answer}>
              {answer ? ANSWER : ""}
            </p>
          </div>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Finished, long thought</h2>
        <div className={own.message}>
          <Reasoning streaming={false} duration={134}>
            {STATIC_REASONING}
          </Reasoning>
          <p className={own.answer} data-shown="true">
            The shopping list for Saturday supper is now $236 before tax. Two more guests add 400 g of lamb and $24;
            bread, dessert and wine are unchanged.
          </p>
        </div>
      </section>

      <section className={styles.group}>
        <h2 className={styles.label}>Finished, opened</h2>
        <div className={own.message}>
          <Reasoning streaming={false} duration={8} defaultOpen>
            {
              "Two guests can’t eat dairy. The gratin becomes roast potatoes with olive oil, and the tart gets a dairy-free crust. Nothing else on the menu uses butter or cream."
            }
          </Reasoning>
        </div>
      </section>
    </div>
  );
}

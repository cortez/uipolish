"use client";

import { CodeBlock } from "@registry/code-block/code-block";
import styles from "./showcase.module.css";

const CODE = `export function scaleRecipe(recipe: Recipe, guests: number) {
  const factor = guests / recipe.serves;
  return recipe.ingredients.map((item) => ({
    ...item,
    amount: Math.round(item.amount * factor * 10) / 10,
  }));
}`;

export default function Showcase() {
  return (
    <div className={styles.wide}>
      <CodeBlock code={CODE} language="ts" title="scale-recipe.ts" lineNumbers />
    </div>
  );
}

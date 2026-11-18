"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@registry/button/button";
import { Dialog } from "@registry/dialog/dialog";
import { Tab, TabList, TabPanel, TabPanels, Tabs } from "@registry/tabs/tabs";
import { InstallCommand } from "./install-command";
import { SetupPicker } from "./setup-picker";
import { SkillPicker } from "./skill-picker";
import styles from "./get-started.module.css";

type Install = Parameters<typeof SkillPicker>[0]["installs"][number];

/** The hash that opens it from anywhere: a link to #get-started. */
const HASH = "#get-started";

/**
 * Get started, the one place on the site: a button in the home page's
 * hero that opens one dialog with a tab for each way in. MCP (your agent installs components by name), the shadcn
 * CLI, the rules as a skill, and Tailwind. A link to /#get-started opens it.
 */
export function GetStarted({ installs }: { installs: readonly Install[] }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => {
      if (location.hash !== HASH) return;
      setOpen(true);
      history.replaceState(null, "", location.pathname + location.search);
    };
    sync();
    addEventListener("hashchange", sync);
    return () => removeEventListener("hashchange", sync);
  }, []);

  return (
    <>
      <Button ref={trigger} variant="secondary" onClick={() => setOpen(true)}>
        Get started
      </Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Get started"
        description="Free and MIT-licensed. No account, no key."
        triggerRef={trigger}
        size="lg"
      >
        <Tabs defaultValue="mcp">
          <TabList aria-label="Ways to use UI Polish">
            <Tab value="mcp">MCP</Tab>
            <Tab value="shadcn">shadcn</Tab>
            <Tab value="rules">Rules</Tab>
            <Tab value="tailwind">Tailwind</Tab>
          </TabList>
          <TabPanels className={styles.panels}>
            <TabPanel value="mcp" className={styles.panel}>
              <p className={styles.text}>
                Connect once, then ask your agent for a component by name, like “add a date picker”. It writes the code,
                its CSS and its guide into your project, and follows the rules for the UI it writes itself.
              </p>
              <SetupPicker />
            </TabPanel>
            <TabPanel value="shadcn" className={styles.panel}>
              <p className={styles.text}>Any component by name, with what it depends on and the tokens, once:</p>
              <InstallCommand command="npx shadcn@latest add https://uipolish.com/r/button.json" />
              <p className={styles.text}>
                Already on a shadcn/ui theme? Add <code>theme</code> first, and the components take your colors and
                radius:
              </p>
              <InstallCommand command="npx shadcn@latest add https://uipolish.com/r/theme.json" />
            </TabPanel>
            <TabPanel value="rules" className={styles.panel}>
              <p className={styles.text}>
                The design rules every component is built on, as a skill your agent keeps for the UI it writes itself:
                motion, states, typography, spacing and surfaces, with concrete values. Over MCP you already have them.
              </p>
              <SkillPicker installs={installs} />
              <p className={styles.text}>
                Read them whole at <a href="/rules.md">/rules.md</a>.
              </p>
            </TabPanel>
            <TabPanel value="tailwind" className={styles.panel}>
              <p className={styles.text}>
                In a Tailwind CSS v4 project, the components come inside Tailwind’s components layer, so your utility
                classes override them. Over MCP, your agent sees Tailwind and asks for it; the shadcn CLI does it for
                you. Then add the bridge once, so you can write <code>bg-ui-surface</code> and{" "}
                <code>text-ui-muted</code>:
              </p>
              <InstallCommand command="npx shadcn@latest add https://uipolish.com/r/tokens.json" />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Dialog>
    </>
  );
}

"use client";

import { Fragment, useId, useState } from "react";
import { Button } from "../button/button";
import { Icon } from "../icons/icons";
import { Switch } from "../switch/switch";
import { toast } from "../toast/toast";
import { Group, SectionHead } from "./parts";
import { message, type SettingsNotifications } from "./shared";
import styles from "./settings.module.css";

type Failure = { text: string };

export type NotificationsProps = SettingsNotifications & {
  headingId: string;
  product: string;
  workspace: string;
  readOnly: boolean;
  announce: (text: string) => void;
};

export function Notifications({
  headingId,
  product,
  workspace,
  events,
  channels,
  value,
  onChange,
  onTest,
  readOnly,
  announce,
}: NotificationsProps) {
  const id = useId();
  // Switches move at once; a save that fails moves them back.
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [failures, setFailures] = useState<Record<string, Failure>>({});
  const [testing, setTesting] = useState<Record<string, boolean>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});

  const keyOf = (event: string, channel: string) => `${event}:${channel}`;
  const isOn = (event: string, channel: string) => optimistic[keyOf(event, channel)] ?? value[event]?.[channel] ?? false;

  async function toggle(event: string, channel: string, on: boolean) {
    if (!onChange) return;
    const key = keyOf(event, channel);
    const eventLabel = events.find((e) => e.id === event)?.label ?? event;
    const channelLabel = channels.find((c) => c.id === channel)?.label ?? channel;
    setFailures((f) => {
      const next = { ...f };
      delete next[event];
      return next;
    });
    setOptimistic((o) => ({ ...o, [key]: on }));
    try {
      await onChange(event, channel, on);
      announce(`${channelLabel} for “${eventLabel}”: ${on ? "on" : "off"}.`);
    } catch (reason) {
      const text = message(
        reason,
        `Couldn’t turn ${on ? "on" : "off"} ${channelLabel} for “${eventLabel}”. It’s still ${on ? "off" : "on"}; try again.`,
      );
      setFailures((f) => ({ ...f, [event]: { text } }));
      announce(text);
    } finally {
      setOptimistic((o) => {
        const next = { ...o };
        delete next[key];
        return next;
      });
    }
  }

  async function test(channel: string) {
    if (!onTest) return;
    const c = channels.find((x) => x.id === channel);
    setTestErrors((e) => {
      const next = { ...e };
      delete next[channel];
      return next;
    });
    setTesting((t) => ({ ...t, [channel]: true }));
    try {
      await onTest(channel);
      toast.success(`Test sent to ${c?.destination ?? channel}`, {
        description:
          c?.label === "Email" ? "It can take a minute to arrive. Check spam if it doesn’t." : `Look for a message from ${product}.`,
      });
    } catch (reason) {
      setTestErrors((e) => ({ ...e, [channel]: message(reason, `Couldn’t reach ${c?.destination ?? channel}. Try again.`) }));
    } finally {
      setTesting((t) => ({ ...t, [channel]: false }));
    }
  }

  return (
    <>
      <SectionHead
        id={headingId}
        title="Notifications"
        intro={`Where ${product} tells ${workspace} that something needs a person. ${readOnly ? "" : "Each switch saves as you flip it."}`}
      />

      <Group id={`${id}-channels`} title="Channels">
        <ul className={styles.rows}>
          {channels.map((c) => (
            <li key={c.id} className={styles.row}>
              <div className={styles.text}>
                <span className={styles.label}>{c.label}</span>
                <p className={styles.description} data-tone={testErrors[c.id] ? "danger" : undefined} aria-live="polite">
                  {testErrors[c.id] ?? <span className={styles.destination}>{c.destination}</span>}
                </p>
              </div>
              {onTest && !readOnly && (
                <div className={styles.control}>
                  <Button
                    variant="secondary"
                    busy={testing[c.id]}
                    busyLabel="Sending…"
                    aria-label={`Send a test to ${c.destination}`}
                    onClick={() => test(c.id)}
                  >
                    Send test
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Group>

      <Group id={`${id}-events`} title="Events">
        <table className={styles.matrix} aria-labelledby={`${id}-events`}>
          <thead>
            <tr>
              <th scope="col" className={styles.eventHead}>
                <span className={styles.srOnly}>Event</span>
              </th>
              {channels.map((c) => (
                <th key={c.id} scope="col" className={styles.channelHead}>
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {events.map((e) => (
              <Fragment key={e.id}>
                <tr data-failed={failures[e.id] ? "" : undefined}>
                  <th scope="row" className={styles.eventHeadCell}>
                    <div className={styles.eventCell}>
                      <span id={`${id}-${e.id}`} className={styles.label}>
                        {e.label}
                      </span>
                      {e.description && <span className={styles.description}>{e.description}</span>}
                    </div>
                  </th>
                  {channels.map((c) => (
                    <td key={c.id} className={styles.switchCell}>
                      <Switch
                        size="sm"
                        aria-label={`${c.label}: ${e.label}`}
                        checked={isOn(e.id, c.id)}
                        busy={keyOf(e.id, c.id) in optimistic}
                        disabled={readOnly || !onChange}
                        onCheckedChange={(on) => void toggle(e.id, c.id, on)}
                      />
                    </td>
                  ))}
                </tr>
                {/* The failure gets the table's full width, under the row it belongs to. */}
                <tr className={styles.errorRow} hidden={!failures[e.id]}>
                  <td colSpan={channels.length + 1}>
                    <p className={styles.rowError}>
                      {failures[e.id] && (
                        <>
                          <Icon name="alert" className={styles.rowErrorIcon} />
                          {failures[e.id].text}
                        </>
                      )}
                    </p>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </Group>
    </>
  );
}

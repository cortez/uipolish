"use client";

import { useId, useMemo } from "react";
import { ModelPicker, type ModelOption } from "../model-picker/model-picker";
import { NumberInput } from "../number-input/number-input";
import { Slider } from "../slider/slider";
import { UsageBreakdown } from "../usage-meter/usage-meter";
import { Group, Row, SectionHead } from "./parts";
import type { ModelFeature, SettingsField, SettingsPlanLimits, SettingsUsage, WorkspaceSettings } from "./shared";
import styles from "./settings.module.css";

const DEFAULT = "default";

export type ModelsProps = {
  headingId: string;
  workspace: string;
  draft: WorkspaceSettings;
  set: <F extends SettingsField>(field: F, value: WorkspaceSettings[F]) => void;
  errors: Partial<Record<SettingsField, string>>;
  fieldId: (field: SettingsField) => string;
  readOnly: boolean;
  models: ModelOption[];
  features: ModelFeature[];
  usage?: SettingsUsage;
  plan: SettingsPlanLimits;
  currency: string;
  numberLocale: string;
};

export function Models({
  headingId,
  workspace,
  draft,
  set,
  errors,
  fieldId,
  readOnly,
  models,
  features,
  usage,
  plan,
  currency,
  numberLocale,
}: ModelsProps) {
  const id = useId();
  const money = useMemo(() => new Intl.NumberFormat(numberLocale, { style: "currency", currency }), [numberLocale, currency]);
  const count = useMemo(() => new Intl.NumberFormat(numberLocale), [numberLocale]);
  const defaultModel = models.find((m) => m.id === draft.defaultModel);
  const featureModels: ModelOption[] = [
    { id: DEFAULT, name: "Default", description: `Follows the workspace default, now ${defaultModel?.name ?? "not set"}` },
    ...models,
  ];

  const maxSpend = plan.maxSpendLimit ?? 100_000;
  const alertAmount = (draft.spendLimit * draft.alertAt) / 100;
  const spent = usage?.spent ?? 0;
  const overLimit = usage !== undefined && draft.spendLimit <= spent;

  return (
    <>
      <SectionHead
        id={headingId}
        title="Models and limits"
        intro={`Which models ${workspace} runs on, and how much it may spend and send.`}
      />

      <Group id={`${id}-models`} title="Models">
        <div className={styles.rows}>
          <Row label="Default model" labelId={`${id}-default`} description="Every feature uses it unless you pick another below.">
            <ModelPicker
              label="Default model"
              models={models}
              value={draft.defaultModel}
              onValueChange={(v) => set("defaultModel", v)}
              disabled={readOnly}
              align="end"
              className={styles.picker}
            />
          </Row>
          {features.map((f) => (
            <Row key={f.id} label={f.label} description={f.description}>
              <ModelPicker
                label={`Model for ${f.label}`}
                models={featureModels}
                value={draft.overrides[f.id] ?? DEFAULT}
                onValueChange={(v) => {
                  const next = { ...draft.overrides };
                  if (v === DEFAULT) delete next[f.id];
                  else next[f.id] = v;
                  set("overrides", next);
                }}
                disabled={readOnly}
                align="end"
                className={styles.picker}
              />
            </Row>
          ))}
        </div>
      </Group>

      <Group id={`${id}-spend`} title="Spend">
        <div className={styles.rows}>
          <Row
            label="Monthly limit"
            align="field"
            descriptionId={`${id}-limit-note`}
            tone={errors.spendLimit ? "danger" : overLimit ? "warning" : undefined}
            description={
              errors.spendLimit ??
              (overLimit
                ? `${workspace} has spent ${money.format(spent)} this month, so runs pause as soon as you save this.`
                : `Runs pause at ${money.format(draft.spendLimit)} and start again on the 1st.`)
            }
          >
            <NumberInput
              id={fieldId("spendLimit")}
              label="Monthly limit"
              hideLabel
              value={draft.spendLimit}
              onValueChange={(v) => set("spendLimit", v)}
              min={1}
              max={maxSpend}
              step={50}
              steppers={false}
              format={{ style: "currency", currency, maximumFractionDigits: 0 }}
              locale={numberLocale}
              disabled={readOnly}
              className={styles.number}
            />
          </Row>
          <div className={styles.block}>
            <Slider
              label="Email admins at"
              min={50}
              max={100}
              step={5}
              value={draft.alertAt}
              onValueChange={(v) => set("alertAt", v)}
              format={(v) => `${v}%`}
              valueText={(v) => `${v}% of the limit`}
              disabled={readOnly}
              className={styles.slider}
            />
            <p className={styles.description}>
              {draft.alertAt === 100
                ? "Admins hear only when runs pause."
                : `Admins get one email when spend reaches ${money.format(alertAmount)}, then another if runs pause.`}
            </p>
          </div>
          {usage && (
            <div className={styles.block}>
              <UsageBreakdown
                kind="money"
                label="Spend so far"
                used={spent}
                limit={draft.spendLimit}
                segments={usage.segments}
                period={usage.period ?? "this month"}
                agent={workspace}
                currency={currency}
                locale={numberLocale}
                thresholds={{ warning: Math.min(draft.alertAt, 99) / 100, danger: 0.95 }}
                messages={{
                  calm: `${money.format(Math.max(0, draft.spendLimit - spent))} left this month.`,
                  warning: `${money.format(Math.max(0, draft.spendLimit - spent))} left. Runs pause at ${money.format(draft.spendLimit)}.`,
                  danger:
                    spent >= draft.spendLimit
                      ? `Limit reached. Runs are paused until the 1st or until you raise it.`
                      : `${money.format(draft.spendLimit - spent)} left. Runs pause at ${money.format(draft.spendLimit)}.`,
                }}
                className={styles.usage}
              />
            </div>
          )}
        </div>
      </Group>

      <Group id={`${id}-rate`} title="Rate limits" intro="Requests past a limit get a 429 and can retry after a second.">
        <div className={styles.rows}>
          <Row
            label="Requests per minute"
            align="field"
            tone={errors.requestsPerMinute ? "danger" : undefined}
            description={
              errors.requestsPerMinute ??
              [
                usage?.peakRequestsPerMinute !== undefined ? `Busiest minute this week: ${count.format(usage.peakRequestsPerMinute)}.` : "",
                plan.maxRequestsPerMinute ? `Your plan allows up to ${count.format(plan.maxRequestsPerMinute)}.` : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <NumberInput
              id={fieldId("requestsPerMinute")}
              label="Requests per minute"
              hideLabel
              value={draft.requestsPerMinute}
              onValueChange={(v) => set("requestsPerMinute", v)}
              min={1}
              max={plan.maxRequestsPerMinute}
              step={10}
              locale={numberLocale}
              disabled={readOnly}
              className={styles.number}
            />
          </Row>
          <Row
            label="Tokens per minute"
            align="field"
            tone={errors.tokensPerMinute ? "danger" : undefined}
            description={
              errors.tokensPerMinute ??
              [
                usage?.peakTokensPerMinute !== undefined ? `Busiest minute this week: ${count.format(usage.peakTokensPerMinute)}.` : "",
                plan.maxTokensPerMinute ? `Your plan allows up to ${count.format(plan.maxTokensPerMinute)}.` : "",
              ]
                .filter(Boolean)
                .join(" ")
            }
          >
            <NumberInput
              id={fieldId("tokensPerMinute")}
              label="Tokens per minute"
              hideLabel
              value={draft.tokensPerMinute}
              onValueChange={(v) => set("tokensPerMinute", v)}
              min={1000}
              max={plan.maxTokensPerMinute}
              step={10_000}
              locale={numberLocale}
              disabled={readOnly}
              className={`${styles.number} ${styles.wide}`}
            />
          </Row>
        </div>
      </Group>
    </>
  );
}

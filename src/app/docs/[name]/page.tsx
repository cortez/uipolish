import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { CopyPage } from "@/components/copy-page";
import { TitleTag } from "@/components/info-tip";
import { InstallCommand } from "@/components/install-command";
import {
  getComponentGuide,
  getComponentMeta,
  listComponents,
  packagesOf,
} from "@/lib/content";
import { collect } from "@/lib/mcp/tools";
import { Markdown } from "@/lib/markdown";
import { JsonLd, docsLd } from "@/lib/seo/json-ld";
import { CONTENT_UPDATED, clip, pageMetadata } from "@/lib/seo/site";
import { LivePreview } from "@/components/live-preview";
import site from "../../site.module.css";
import styles from "./component.module.css";

type Tree = Map<string, Tree>;

/** A template's files: one column per top-level folder, each level folders
 *  first, A to Z. A folder whose only child is a folder shares its row. */
function FileTree({ paths }: { paths: string[] }) {
  const root: Tree = new Map();
  for (const p of paths) {
    let node = root;
    for (const part of p.split("/"))
      node = node.get(part) ?? node.set(part, new Map()).get(part)!;
  }
  const sorted = (node: Tree) =>
    [...node.entries()].sort(
      ([a, x], [b, y]) =>
        Number(y.size > 0) - Number(x.size > 0) || a.localeCompare(b),
    );
  // Folds a chain of lone folders into one label: components/app/.
  const fold = (part: string, node: Tree): [string, Tree] => {
    let label = `${part}/`;
    while (node.size === 1) {
      const [[child, grand]] = node.entries();
      if (grand.size === 0) break;
      label += `${child}/`;
      node = grand;
    }
    return [label, node];
  };
  const count = (node: Tree): number =>
    [...node.values()].reduce((n, c) => n + (c.size ? count(c) : 1), 0);
  const render = (node: Tree) => (
    <ul>
      {sorted(node).map(([part, children]) => {
        if (!children.size) {
          return (
            <li key={part}>
              <code>{part}</code>
            </li>
          );
        }
        const [label, inner] = fold(part, children);
        return (
          <li key={part}>
            <code data-folder="">{label}</code>
            {render(inner)}
          </li>
        );
      })}
    </ul>
  );
  return (
    <div className={styles.tree}>
      {sorted(root).map(([part, children]) => {
        const [label, inner] = fold(part, children);
        return (
          <section key={part} className={styles.treeColumn} aria-label={label}>
            <h3 className={styles.treeHead}>
              <code>{label}</code>
              <span>{count(children)} files</span>
            </h3>
            {render(inner)}
          </section>
        );
      })}
    </div>
  );
}

export async function generateStaticParams() {
  return (await listComponents())
    .filter((c) => !c.primitive)
    .map(({ name }) => ({ name }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>;
}): Promise<Metadata> {
  const meta = await getComponentMeta((await params).name);
  if (!meta || meta.primitive) return {};
  return pageMetadata({
    title:
      meta.type === "template"
        ? `${meta.title}: a Next.js starter template`
        : `${meta.title} React component`,
    description: clip(meta.summary),
    path: `/docs/${meta.name}`,
    type: "article",
  });
}

export default async function ComponentPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const meta = await getComponentMeta(name);
  if (!meta || meta.primitive) notFound();
  const guide = await getComponentGuide(name);
  const template = meta.type === "template";
  const deps = (
    await Promise.all(meta.dependencies.map(getComponentMeta))
  ).filter((d) => d !== null);
  const packages = packagesOf(await collect(name));
  const tag: {
    kind: "block" | "kit";
    label: string;
    note: string;
  } | null =
    template
      ? { kind: "block", label: "Template", note: "A working Next.js app, built from the blocks." }
      : meta.type === "block"
        ? { kind: "block", label: "Block", note: "A whole screen, composed from the components." }
        : meta.kit === "agent"
          ? { kind: "kit", label: "Agent kit", note: "For AI products." }
          : null;
  const ld = docsLd({
    path: `/docs/${name}`,
    headline: template
      ? `${meta.title}: a Next.js starter template`
      : `${meta.title} React component`,
    description: meta.summary,
    dateModified: CONTENT_UPDATED,
    trail: [
      ["UI Polish", "/"],
      ["Docs", "/docs"],
      [meta.title, `/docs/${name}`],
    ],
  });

  return (
    <>
      <JsonLd nodes={ld} />
      <header className={site.intro}>
        {/* The title, and what kind of thing it is beside it: one chip whose
            note shows on hover, so the header is title, summary, action. */}
        <div className={styles.titleRow}>
          <h1 className={site.title}>{meta.title}</h1>
          {tag && (
            <TitleTag kind={tag.kind} label={tag.label} note={tag.note} />
          )}
        </div>
        <p className={site.text}>{meta.summary}</p>
        <div className={site.actions}>
          <CopyPage />
        </div>
      </header>

      <div
        className={
          template
            ? `${styles.wideStage} ${styles.wideTemplate}`
            : meta.stage === "wide"
              ? `${site.stage} ${styles.blockStage} ${styles.wideStage}`
              : meta.type
                ? `${site.stage} ${styles.blockStage}`
                : site.stage
        }
      >
        <LivePreview name={name} />
      </div>

      <section className={site.section} aria-labelledby="setup">
        <h2 id="setup" className={site.heading}>
          Installation
        </h2>
        <p className={site.text}>
          With UI Polish <Link href="/docs">connected</Link>, ask your agent:
        </p>
        <div className={site.actions}>
          <InstallCommand
            command={
              template
                ? `Set up the UI Polish ${meta.title} template in this Next.js project.`
                : `Add the UI Polish ${meta.title.toLowerCase()} to this project.`
            }
            label="Prompt"
          />
        </div>
        <p className={site.text}>
          Or with <Link href="/docs/shadcn">the shadcn CLI</Link>:
        </p>
        <div className={site.actions}>
          <InstallCommand
            command={
              `npx shadcn@latest add https://uipolish.com/r/${meta.name}.json`
            }
            label="shadcn command"
          />
        </div>
        <div className={site.table}>
          <table>
            <tbody>
              {packages.length > 0 && (
                <tr>
                  <th scope="row">Package</th>
                  <td>
                    {packages.map((p, i) => (
                      <span key={p}>
                        {i > 0 && ", "}
                        <code>{p.replace(/@[^@/]*$/, "")}</code>
                      </span>
                    ))}
                  </td>
                </tr>
              )}
              {deps.length > 0 && (
                <tr>
                  <th scope="row">Brings in</th>
                  <td>
                    {deps.map((d, i) => (
                      <span key={d.name}>
                        {i > 0 && ", "}
                        {d.primitive ? (
                          d.title
                        ) : (
                          <Link href={`/docs/${d.name}`}>{d.title}</Link>
                        )}
                      </span>
                    ))}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {template && meta.files && (
        <section className={site.section} aria-labelledby="files">
          <h2 id="files" className={site.heading}>
            Files
          </h2>
          <p className={site.text}>
            Routes in <code>app/</code>, the screens in{" "}
            <code>components/app/</code>, and the parts you swap (model, auth,
            storage) in <code>lib/</code>. The components it uses install to{" "}
            <code>components/ui/</code>.
          </p>
          <FileTree paths={meta.files} />
        </section>
      )}

      <article className={styles.prose}>
        <Markdown source={guide} skipTitle />
      </article>
    </>
  );
}

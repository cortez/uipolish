import type { Metadata } from "next";
import Link from "@/components/link";
import { notFound } from "next/navigation";
import { CopyPage } from "@/components/copy-page";
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
    title: `${meta.title} React component`,
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
  const deps = (
    await Promise.all(meta.dependencies.map(getComponentMeta))
  ).filter((d) => d !== null);
  const packages = packagesOf(await collect(name));
  const ld = docsLd({
    path: `/docs/${name}`,
    headline: `${meta.title} React component`,
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
        </div>
        <p className={site.text}>{meta.summary}</p>
        <div className={site.actions}>
          <CopyPage />
        </div>
      </header>

      <div
        className={
          meta.stage === "wide"
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
          With UI Polish <a href="#get-started">connected</a>, ask your agent:
        </p>
        <div className={site.actions}>
          <InstallCommand
            command={`Add the UI Polish ${meta.title.toLowerCase()} to this project.`}
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


      <article className={styles.prose}>
        <Markdown source={guide} skipTitle />
      </article>
    </>
  );
}

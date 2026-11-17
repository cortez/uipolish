import { getTailwind } from "@/lib/content";
import { Markdown } from "@/lib/markdown";
import { DocPage, docMetadata } from "../doc-page";
import prose from "../[name]/component.module.css";

const DOC = {
  path: "/docs/tailwind",
  heading: "Tailwind CSS",
  title: "Tailwind CSS: use UI Polish components in a Tailwind v4 project",
  description:
    "Use UI Polish in a Tailwind CSS v4 project: components whose styles your utility classes override, theme values for the same colors in your own markup, and the roles mapped onto your palette.",
};

export const metadata = docMetadata(DOC);

export default async function TailwindPage() {
  // The page and get_rules("tailwind") read the same file. Its title is the
  // page heading and its first paragraph the lede.
  const [, lede, ...rest] = (await getTailwind()).split(/\n\n/);
  return (
    <DocPage doc={DOC} lede={lede.replace(/\s*\n\s*/g, " ")}>
      <article className={prose.prose}>
        <Markdown source={rest.join("\n\n")} />
      </article>
    </DocPage>
  );
}

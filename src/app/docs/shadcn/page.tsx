import { getShadcn } from "@/lib/content";
import { Markdown } from "@/lib/markdown";
import { DocPage, docMetadata } from "../doc-page";
import prose from "../[name]/component.module.css";

const DOC = {
  path: "/docs/shadcn",
  heading: "shadcn/ui",
  title: "shadcn/ui: install UI Polish with the shadcn CLI",
  description:
    "Install UI Polish components with npx shadcn add, by URL or through the @uipolish registry, with the roles mapped onto your shadcn theme.",
};

export const metadata = docMetadata(DOC);

export default async function ShadcnPage() {
  // The page and the Markdown version read the same file. Its title is the
  // page heading and its first paragraph the lede.
  const [, lede, ...rest] = (await getShadcn()).split(/\n\n/);
  return (
    <DocPage doc={DOC} lede={lede.replace(/\s*\n\s*/g, " ")}>
      <article className={prose.prose}>
        <Markdown source={rest.join("\n\n")} />
      </article>
    </DocPage>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SCREENS, SCREEN_INFO } from "@pro/index";
import { ProPreview } from "@/components/pro-preview";
import { pageMetadata } from "@/lib/seo/site";

type Props = { params: Promise<{ name: string }> };

export function generateStaticParams() {
  return SCREEN_INFO.filter((s) => s.name !== "copper").map((s) => ({ name: s.name }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { name } = await params;
  const info = SCREEN_INFO.find((s) => s.name === name);
  if (!info) return {};
  return pageMetadata({ title: info.title, description: info.summary, path: `/pro/${name}` });
}

/** A UI Polish Pro screen's live preview, filling the window like /example. */
export default async function Page({ params }: Props) {
  const { name } = await params;
  const Screen = SCREENS[name];
  const info = SCREEN_INFO.find((s) => s.name === name);
  if (!Screen || !info || name === "copper") notFound();
  return (
    <ProPreview title={info.title}>
      <Screen />
    </ProPreview>
  );
}

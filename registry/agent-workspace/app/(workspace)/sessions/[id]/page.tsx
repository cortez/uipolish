import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { SessionScreen } from "@/components/app/session-screen";
import { workspaceFor } from "@/lib/coding/server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { api } = await workspaceFor();
  const session = await api.session((await params).id);
  return { title: session?.title ?? "Session" };
}

/* A session, painted with the page; it streams from there. */
export default async function SessionPage({ params }: Props) {
  const { api } = await workspaceFor();
  const session = await api.session((await params).id);
  if (!session) notFound();
  return <SessionScreen sessionId={session.id} initial={session} />;
}

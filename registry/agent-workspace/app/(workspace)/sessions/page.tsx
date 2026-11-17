import { SessionScreen } from "@/components/app/session-screen";

export const metadata = { title: "New session" };

/* Home: a new session, the composer and a few starters. */
export default function NewSessionPage() {
  return <SessionScreen sessionId={null} />;
}

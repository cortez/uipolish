import { redirect } from "next/navigation";
import { devSignIn, getUser } from "@/lib/session";
import { SignInScreen } from "./sign-in-screen";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getUser()) redirect("/runs");
  return <SignInScreen dev={devSignIn} />;
}

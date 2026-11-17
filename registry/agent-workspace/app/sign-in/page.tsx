import { redirect } from "next/navigation";
import { devSignIn, getUser } from "@/lib/coding/auth";
import { SignInScreen } from "./sign-in-screen";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getUser()) redirect("/sessions");
  return <SignInScreen dev={devSignIn} />;
}

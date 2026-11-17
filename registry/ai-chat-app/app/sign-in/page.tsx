import { redirect } from "next/navigation";
import { devSignIn, getUser } from "@/lib/auth";
import { SignInScreen } from "./sign-in-screen";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  if (await getUser()) redirect("/chat");
  return <SignInScreen dev={devSignIn} />;
}

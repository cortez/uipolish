"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignIn } from "@/components/ui/sign-in/sign-in";
import { ProductMark } from "@/components/app/glyphs";
import { PRODUCT_NAME } from "@/lib/config";
import { checkCode, requestCode } from "./actions";
import styles from "./sign-in.module.css";

/* The kit's Sign in block, on the server actions next to it. One flow
   signs in and signs up: the code decides, not the button. */

export function SignInScreen({ dev }: { dev: boolean }) {
  const router = useRouter();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  return (
    <SignIn
      fullPage
      autoFocus
      mode={mode}
      onModeChange={setMode}
      productName={PRODUCT_NAME}
      brand={
        <span className={styles.brand}>
          <span className={styles.tile}>
            <ProductMark />
          </span>
          {PRODUCT_NAME}
        </span>
      }
      legal={
        dev
          ? "Development sign-in: any email works, and the code is printed in the terminal running the app."
          : "By continuing, you agree to the Terms of Service and Privacy Policy."
      }
      onSendCode={requestCode}
      onVerify={checkCode}
      onSuccess={() => {
        router.replace("/chat");
        router.refresh();
      }}
    />
  );
}

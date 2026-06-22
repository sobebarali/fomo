"use client";

import { Button } from "@fomo/ui/components/button";
import { useLogin } from "@privy-io/react-auth";

// Sign-in entry (client island): the green "Start trading" CTA opens the Privy
// modal (Apple/Google). Reused in the nav, hero, and CTA band.
export function StartTradingButton({
  className,
  size = "default",
  children = "Start trading",
}: {
  className?: string;
  size?: "default" | "sm" | "lg";
  children?: React.ReactNode;
}) {
  const { login } = useLogin();
  return (
    <Button className={className} onClick={() => login()} size={size}>
      {children}
    </Button>
  );
}

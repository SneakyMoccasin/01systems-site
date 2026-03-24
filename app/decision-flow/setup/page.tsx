"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function DecisionSetupPage() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main decision flow page - setup is now integrated
    router.replace("/decision-flow");
  }, [router]);

  return null;
}


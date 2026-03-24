"use client";

import { WorldProvider } from "@/worldEngine/core/worldState";

export default function PlayLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <WorldProvider>
      {children}
    </WorldProvider>
  );
}


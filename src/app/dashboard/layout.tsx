import type { ReactNode } from "react";

/** Allow server action `warmBatchInsights` to run ~10 sequential OpenAI calls. */
export const maxDuration = 120;

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return children;
}

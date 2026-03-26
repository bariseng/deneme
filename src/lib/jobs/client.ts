// ─── Inngest Background Job Client ──────────────────────────
// Serverless-compatible job queue for long-running tasks

import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ihalepro",
  name: "İhalePro",
});

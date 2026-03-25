import { z } from "zod";

export const tenderFilterSchema = z.object({
  q: z.string().optional(),
  city: z.string().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  sort: z.string().optional(),
  order: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
});

export type TenderFilter = z.infer<typeof tenderFilterSchema>;

import { z } from "zod";

export const notificationRuleSchema = z.object({
  name: z.string().min(1, "Kural adı zorunludur"),
  cities: z.array(z.string()).optional().default([]),
  tenderTypes: z.array(z.enum(["YAPIM", "MAL_ALIMI", "HIZMET", "DANISMANLIK"])).optional().default([]),
  keywords: z.array(z.string()).optional().default([]),
  budgetMin: z.coerce.number().optional(),
  budgetMax: z.coerce.number().optional(),
  emailNotify: z.boolean().optional().default(true),
  pushNotify: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export const markReadSchema = z.object({
  ids: z.array(z.string()).min(1, "En az bir bildirim seçiniz"),
});

export type NotificationRuleInput = z.infer<typeof notificationRuleSchema>;

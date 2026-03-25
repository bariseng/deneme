import { z } from "zod";

export const bidItemSchema = z.object({
  description: z.string().min(1, "Kalem açıklaması zorunludur"),
  unit: z.string().min(1, "Birim zorunludur"),
  quantity: z.coerce.number().positive("Miktar pozitif olmalıdır"),
  unitPrice: z.coerce.number().positive("Birim fiyat pozitif olmalıdır"),
});

export const createBidSchema = z.object({
  tenderId: z.string().min(1, "İhale seçimi zorunludur"),
  items: z.array(bidItemSchema).optional(),
  notes: z.string().optional(),
  letterContent: z.string().optional(),
  companyName: z.string().optional(),
  companyTaxNo: z.string().optional(),
  companyAddress: z.string().optional(),
  companyPhone: z.string().optional(),
  companyEmail: z.string().optional(),
  contactPerson: z.string().optional(),
});

export const updateBidSchema = createBidSchema.partial().extend({
  status: z.enum(["TASLAK", "TAMAMLANDI", "GONDERILDI"]).optional(),
});

export type CreateBidInput = z.infer<typeof createBidSchema>;
export type UpdateBidInput = z.infer<typeof updateBidSchema>;

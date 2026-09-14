import { z } from "zod";

const requiredText = z.string().trim().min(1, "required");

export const createAddressSchema = z.object({
  receiverName: requiredText,
  phone: requiredText,
  province: requiredText,
  city: requiredText,
  district: requiredText,
  detail: requiredText,
  isDefault: z.boolean(),
});

export type AddressFormValues = z.infer<typeof createAddressSchema>;

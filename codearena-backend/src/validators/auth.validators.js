import { z } from "zod";

export const googleSignInSchema = {
  body: z.object({
    credential: z.string().min(20, "Missing Google credential").max(4096),
  }),
};

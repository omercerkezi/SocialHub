import { BadRequestException } from "@nestjs/common";
import { ZodSchema } from "zod";

export function parseBody<T>(schema: ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join(".") || "body";
      if (!fields[key]) fields[key] = issue.message;
    }
    throw new BadRequestException({ message: "Check the highlighted fields.", fields });
  }
  return result.data;
}

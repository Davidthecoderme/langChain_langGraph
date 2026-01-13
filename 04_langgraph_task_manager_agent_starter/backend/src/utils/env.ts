import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  // Which provider to use by default
  PROVIDER: z.enum(["groq", "openai", "gemini"]).default("gemini"),

  // Allowed origin for CORS
  ALLOWED_ORIGIN: z.string().default("http://localhost:3000"),

  // Keys (optional depending on provider)
  GROQ_API_KEY: z.string().optional(),
  GOOGLE_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Models (defaults)
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  GEMINI_MODEL: z.string().default("gemini-2.0-flash-lite"),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"), 

  // Server
  PORT: z.string().default("5000"),
})
.superRefine((val, ctx) => {
  if (val.PROVIDER === "groq" && !val.GROQ_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GROQ_API_KEY"], message: "GROQ_API_KEY is required when PROVIDER=groq" });
  }
  if (val.PROVIDER === "gemini" && !val.GOOGLE_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["GOOGLE_API_KEY"], message: "GOOGLE_API_KEY is required when PROVIDER=gemini" });
  }
  if (val.PROVIDER === "openai" && !val.OPENAI_API_KEY) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["OPENAI_API_KEY"], message: "OPENAI_API_KEY is required when PROVIDER=openai" });
  }
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    "Error occurred while parsing env variables: " +
      JSON.stringify(parsed.error.format())
  );
}

const raw = parsed.data;

export const env = Object.freeze({
  PROVIDER: raw.PROVIDER,
  ALLOWED_ORIGIN: raw.ALLOWED_ORIGIN,

  GROQ_API_KEY: raw.GROQ_API_KEY,
  GOOGLE_API_KEY: raw.GOOGLE_API_KEY,
  OPENAI_API_KEY: raw.OPENAI_API_KEY,

  GROQ_MODEL: raw.GROQ_MODEL,
  GEMINI_MODEL: raw.GEMINI_MODEL,
  OPENAI_MODEL: raw.OPENAI_MODEL,

  PORT: raw.PORT,
});
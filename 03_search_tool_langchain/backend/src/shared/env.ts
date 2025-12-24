
import {z} from 'zod'


const EnvSchema = z.object({
  PORT: z.string().default("5000"),
  ALLOWED_ORIGIN: z.url().default('http://localhost:5000'),
  MODEL_PROVIDER : z.enum(['gemini' , 'groq']).default('gemini'),
  GOOGLE_API_KEY : z.string().optional(),
  GROQ_API_KEY : z.string().optional(),
  GEMINI_MODEL : z.string().default("gemini-2.0-flash-lite "),
  GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
  SEARCH_PROVIDER: z.string().default("tavily"),
  TAVILY_API_KEY : z.string().optional(),
})

export const env =EnvSchema.parse(process.env)




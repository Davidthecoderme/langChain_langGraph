
import dotenv from 'dotenv';
import {z} from 'zod'

dotenv.config();

const EnvSchema = z.object({
    GROQ_API_KEY: z.string().min(1 , "GROQ_API_KEY is required"),
    GROQ_MODEL: z.string().default("llama-3.1-8b-instant"),
    PORT: z.string().default("5000"),
})

const parsed = EnvSchema.safeParse(process.env);

if(parsed.success === false){
    throw new Error("Error occured while parsing env variables " + JSON.stringify(parsed.error.format()))
}

const raw = parsed.data;

export const env = Object.freeze({
    GROQ_API_KEY: raw.GROQ_API_KEY,
    GROQ_MODEL: raw.GROQ_MODEL,
    PORT: Number(raw.PORT),
})

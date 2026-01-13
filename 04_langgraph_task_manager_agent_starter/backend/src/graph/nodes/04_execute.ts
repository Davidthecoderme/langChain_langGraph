import { ChatGroq } from '@langchain/groq';
import {z} from 'zod'
import { env } from '../../utils/env';
import { State } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';



/**
 * executeNode
 *
 * Role:
 * - Takes planned steps (state.steps)
 * - Uses the LLM to generate one short "execution note" per step
 * - Combines (step + note) into results[] and marks status as "done"
 *
 * Important:
 * - This node does NOT actually perform real actions (API calls, bookings, etc.)
 *   It currently simulates execution by producing human-readable notes.
 *
 * State reads:
 * - steps, status
 *
 * State writes:
 * - results[], status="done", message
 *
 * Robustness:
 * - We enforce a 1:1 mapping between steps and notes (same index)
 * - If the model returns fewer notes, we fill missing notes with a default string
 */

// Schema for model output
const ExecutionNotesSchema = z.object({
    notes: z.array(z.string().min(1).max(500)).min(1).max(20)
})

type ExecutionNotes = z.infer<typeof ExecutionNotesSchema>;

export function getChatModel(provider: "groq" | "openai" | "gemini") {
  if (provider === "groq") {
    return new ChatGroq({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, temperature: 0.2 });
  }
  if (provider === "openai") {
    return new ChatOpenAI({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, temperature: 0.2 });
  }
  return new ChatGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY, model: env.GEMINI_MODEL, temperature: 0.2 });
}

// Build a human prompt
function createHumanPromptContent(steps: string[]) {

    return ([
        'you are a helpful assisstant', 
        "Given these steps, write one short note for each step.",
        'Return only JSON in the shape: {"notes": string[]}.',
        "Rules:",
        "- notes.length must equal steps.length",
        "- each note <= 300 characters",
        "- plain text only (no markdown)",
        `Steps: ${JSON.stringify(steps)}`
    ].join('\n'))
}


export async function executeNode( state: State ) : Promise<Partial<State>>{
    if(state.status === 'cancelled') return {}

    const steps =  state.steps ?? [] ; 

    if (steps.length === 0) {
        return {}
    }

    const model = getChatModel(env.PROVIDER);

    const structured = model.withStructuredOutput(ExecutionNotesSchema);

    const out : ExecutionNotes = await structured.invoke([
        {
            role : 'system',
            content: "Return only the valid JSON that matches the schema"
        },{
            role: 'human',
            content: createHumanPromptContent(steps)
        }
    ])

    const count = Math.min(steps.length , out.notes.length) 

    // Enforce 1 note per step even if model under/over-produces
    const results = steps.map((step, i) => ({
        step,
        note: out.notes[i] ?? "No note generated."
    }));


    return {
        results,
        status: 'done',
        message:`Executed  ${results.length} steps`
    }




}
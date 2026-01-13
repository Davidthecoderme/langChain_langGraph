import {z} from 'zod';
import {ChatGroq} from '@langchain/groq';
import {env} from '../../utils/env';
import { State } from '../types';
import { ChatOpenAI } from '@langchain/openai';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';



/**
 * Planner output contract (Zod schema)
 *
 * Why we need this:
 * - LLMs can reply with paragraphs, extra text, or the wrong shape.
 * - withStructuredOutput(PlanSchema) forces the model to return a JS object
 *   that matches this schema (runtime validated).
 *
 * Shape:
 * - { steps: string[] }
 *
 * Constraints:
 * - 1–10 steps total
 * - each step is 1–500 characters
 */

export const PlanSchema = z.object({
    steps: z.array(z.string().min(1 , 'each step should be at least 1 character').max(500 , ' each step should be at most 500 characters'))
    .min(1).max(10)
});

export type Plan = z.infer<typeof PlanSchema>;

export function getChatModel(provider: "groq" | "openai" | "gemini") {
  if (provider === "groq") {
    return new ChatGroq({ apiKey: env.GROQ_API_KEY, model: env.GROQ_MODEL, temperature: 0.2 });
  }
  if (provider === "openai") {
    return new ChatOpenAI({ apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, temperature: 0.2 });
  }
  return new ChatGoogleGenerativeAI({ apiKey: env.GOOGLE_API_KEY, model: env.GEMINI_MODEL, temperature: 0.2 });
}


// build the user prompt for panning,  and it is easy to tweak without touching the node logic
function userPromptTemplate(input : string){
    return [
        `user goal: ${input}`,
        'draft a small plan with 3-5 steps to achieve the goal.',
        'each step should be short, concise and actionable.',
    ].join('\n');
}

// Ensure we never return more than N steps to the UI / next nodes. Also avoids crashing if arr is undefined/not an array.
function firstTakenN(arr: string[] , n: number) {
    return Array.isArray(arr) ? arr.slice(0,n) : [];
}


/**
 * PlanFromTaskDescription (LangGraph node)
 *
 * Role in the graph:
 * - Takes the validated user input (state.input)
 * - Uses the LLM to generate a step-by-step plan (steps[])
 * - Stores the plan back into the graph state
 *
 * State reads:
 * - state.input: the user's goal
 * - state.status: if cancelled, skip work
 *
 * State writes:
 * - steps: planned steps (trimmed to 5)
 * - status: remains "planned"
 *
 * Typical lifecycle:
 * - ValidateNode => ensures input is ok
 * - PlanFromTaskDescription => creates steps[]
 * - approveNode => pauses and asks the user to approve steps
 * - executeNode => runs steps and fills results[]
 */
export async function PlanFromTaskDescriptionNode(state: State): Promise<Partial<State>> {
    if(state.status === 'cancelled') return {};


    const model = getChatModel(env.PROVIDER); 

    const structure = model.withStructuredOutput(PlanSchema);

    const plan = await structure.invoke([
        {   
            role: 'system',
            content: [
                'You are an expert task planner.' ,
                'You take a task description and break it down into a list of steps to accomplish the task.',
                'Each step should be concise and actionable.',
                'Respond only with the JSON structure specified.'
                
            ].join('\n')
        },
        {
            role: 'human',
            content: userPromptTemplate(state.input)  
        }
    ]);


    const steps = firstTakenN(plan.steps , 5);

    return {
        steps, status: 'planned'
    }

}
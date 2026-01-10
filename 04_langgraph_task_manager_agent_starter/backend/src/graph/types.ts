// define the state that flows through the langgraph 

import {z} from 'zod';

export const ExecutionStateSchema = z.enum(['planned' , 'done' , 'cancelled']);

export type ExecutionState = z.infer<typeof ExecutionStateSchema>;

// step result 
export const stepResultSchema = z.object({
    step:z.string(),
    note: z.string()
})

export type StepResult = z.infer<typeof stepResultSchema>;

// state -> zod schema 

// State lifecycle:
// - start: { input, status:"planned" }
// - plan: steps[] is filled
// - approve: approved=true/false (false => status="cancelled")
// - execute: results[] filled, status="done"
// - respond: message filled (final UI output)
//
// Invariants:
// - results[] order matches steps[] order
// - status="done" => results[] should exist (and usually message)
// - status="cancelled" => execution should not run
export const StateSchema = z.object({
    input: z.string().min(5 , 'input is required').max(500 , ' input can be at most 500 characters'),
    steps: z.array(z.string()).optional(),
    approved: z.boolean().default(false).optional(),
    results: z.array(stepResultSchema).optional(),
    status: ExecutionStateSchema.optional(),
    message: z.string().optional(),
})


export type State = z.infer<typeof StateSchema>;

//initial state 

export function initialState(input: string): State {
    return {
        input,
        status: 'planned',
    }
}

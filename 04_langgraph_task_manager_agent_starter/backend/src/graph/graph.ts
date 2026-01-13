import { Annotation , Command, END, MemorySaver, START ,StateGraph } from "@langchain/langgraph"
import { ValidateNode } from "./nodes/01_validate";
import { PlanFromTaskDescriptionNode } from "./nodes/02_plan";
import { approveNode } from "./nodes/03_approved";
import { executeNode } from "./nodes/04_execute";
import { finalizeNode } from "./nodes/05_finalize";
import { Interrupt } from "langchain";
import { initialState, State } from "./types";


// define and complie the langgraph workflow 

// startAgentRun 

// resumeAgentRun 


/**
 * Graph Wiring File (LangGraph Orchestrator)
 *
 * This file does 3 main things:
 * 1) Defines the shared state shape (StateAnn) that flows through all nodes
 * 2) Defines the graph structure (nodes + edges + branching)
 * 3) Exposes two runtime APIs:
 *    - startAgentRun(input): start a new thread/run and return either:
 *        a) an interrupt payload (threadId + steps) for UI approval
 *        b) the final state if the run completes without pausing
 *    - resumeAgentRun({threadId, approve}): resume the paused thread with the user's decision
 *
 * Key concept: "state merging"
 * - Each node returns Partial<State> (only the fields it updates).
 * - LangGraph merges those updates into the existing state based on the state definition.
 *
 * Key concept: "interrupt / resume"
 * - approveNode calls runtime.interrupt({type, steps})
 * - The graph pauses and returns __interrupt__ payload to the caller (startAgentRun)
 * - The UI later calls resumeAgentRun with {threadId, approve}
 * - resumeAgentRun sends Command({ resume: { approve } }) into the graph
 * - The paused interrupt resolves inside approveNode with that resume value
 */

/**
 * State annotations (runtime-visible state definition)
 *
 * Why Annotation is needed:
 * - TypeScript types do not exist at runtime.
 * - LangGraph needs to know:
 *   - what fields are allowed in the state
 *   - how to merge partial updates returned by nodes
 *   - how to checkpoint and restore state during interrupts
 *
 * NOTE (recommended improvement):
 * - Do NOT include the string literal "undefined" in status.
 *   If you want optional, use `| undefined` (real undefined) not `"undefined"`.
 */

const StateAnn = Annotation.Root({
    input: Annotation<string>,
    steps: Annotation<string[] | undefined>,
    approved: Annotation<boolean | undefined>,
    results: Annotation<Array<{step:string ; note: string}> | undefined>,   // Execution output: each step paired with a note/outcome
    status: Annotation<'planned' | 'done' | 'cancelled' | undefined>,
    message: Annotation<string | undefined>,
})


/**
 * Build the graph:
 * - addNode(name, function)
 * Each function receives (state, runtime) and returns Partial<State>.
 */
const builder = new StateGraph(StateAnn).addNode('validate' , ValidateNode)
.addNode('plan' , PlanFromTaskDescriptionNode)
.addNode('approve' , approveNode)
.addNode('execute' , executeNode)
.addNode('finalize' , finalizeNode); 


/**
 * Edges (the normal linear flow):
 * START -> validate -> plan -> approve
 */
builder.addEdge(START, 'validate')
builder.addEdge('validate' , 'plan')
builder.addEdge('plan' , 'approve')


/**
 * here comes with two conditions, we use addConditionalEdge 
 * Conditional branch after approval:
 * - If approved === true, continue to execute
 * - If approved === false/undefined, skip execution and finalize
 *
 * NOTE:
 * - This function reads the CURRENT merged state at the end of approve node.
 */
builder.addConditionalEdges('approve' , (s : typeof StateAnn.State) => {
    return s.approved ? 'execute' : 'finalize'
})

builder.addEdge('execute' , 'finalize')
builder.addEdge('finalize' , END)



/**
 * Checkpointer
 *
 * Why needed:
 * - Interrupt/resume requires the graph to store state + position.
 * - When approveNode interrupts, the run pauses and is saved under thread_id.
 * - resumeAgentRun can later restore and continue using the same thread_id.
 *
 * MemorySaver is in-memory only:
 * - If your server restarts, paused runs are lost. thus only for demo/dev use.
 * - For production, will use a persistent checkpointer (DB-backed).
 */
const checkPointer = new MemorySaver()

// Compile the graph into an executable runnable.
const graph = builder.compile({
    checkpointer : checkPointer
})

// Creates a unique thread id for each new run. Used by checkpointer to store/retrieve paused runs.
function createThreadId() {
  return `t_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
}


/**
 * startAgentRun
 *
 * Starts a brand new graph run using a fresh threadId.
 *
 * Returns either:
 * - { interrupt: { threadId, steps } } when approveNode pauses the graph
 * - { final: State } when the graph finishes without pausing
 *
 * How interrupt is detected:
 * - LangGraph returns a special "__interrupt__" structure on the result object.
 * - We extract the first interrupt payload and read steps from it.
 */
export async function startAgentRun(input:string) : Promise<{interrupt : {threadId: string ; steps: string[]}} | {final :State}> {
    const threadId = createThreadId()

    // Thread config: this identifies the run for checkpointing & resume.
    const config = { configurable : {thread_id: threadId }} ;

    // Start from initial state derived from user input.
    const result : any = await graph.invoke(initialState(input) , config) 

    console.log("start output:", result);
    
    // If the graph paused (interrupt), extract steps and return to UI.
    if(result && result.__interrupt__){
        const first = Array.isArray(result.__interrupt__) ? result.__interrupt__[0] : result.__interrupt__

        const steps = (first?.value.steps as string[]) ?? [];
        
        return {
            interrupt : {
                threadId,
                steps
            }
        }
    }

    return {
        final : result as State
    }
}

/**
 * resumeAgentRun
 *
 * Resume a previously interrupted run.
 *
 * Inputs:
 * - threadId: identifies which paused run to resume
 * - approve: user decision from UI
 *
 * How resume works:
 * - We invoke the graph with a Command({ resume: { approve }})
 * - LangGraph loads the paused state for threadId and continues execution
 * - Inside approveNode, the interrupt(...) call "returns" the resume value
 * - The graph then continues to execute/finalize and returns final state
 */
export async function resumeAgentRun(args : {threadId : string ; approve : boolean}) : Promise<State>{
    const {threadId , approve} = args;

    const config = {configurable : {thread_id : threadId} };

    const finalState = await graph.invoke(
        new Command({resume : approve}), // send resume command into the graph, because a previous run paused at interrupt()
        config
    ) as State;

    if (!finalState || (typeof finalState === "object" && Object.keys(finalState).length === 0)) {
        throw new Error("INVALID_THREAD_ID");
    } 

    console.log("resume output:", finalState);

    return finalState;
}


import { State } from "../types";

// role : paused the graph , and ask the user for approval to continue

/**
 * Approval Node
 *
 * Role:
 * - Pause the LangGraph execution after planning
 * - Send the planned steps to the UI
 * - Wait for the user to approve or reject the plan
 * - Resume the graph with the user's decision
 *
 * Why this node exists:
 * - Some workflows require explicit user confirmation before execution
 * - This node creates a controlled "human-in-the-loop" checkpoint
 *
 * How it works:
 * 1. If the flow is already cancelled, do nothing
 * 2. If there are no steps, auto-approve
 * 3. Otherwise, interrupt the graph and send steps to the UI
 * 4. Wait for a decision from the UI (approve / reject)
 * 5. Normalize the decision into a boolean and store it in state
 *
 * Expected UI behavior:
 * - Receive { type: "approval_request", steps }
 * - Render steps and approval buttons
 * - Resume the graph with either:
 *   - true / false
 *   - or { approve: boolean }
 *
 * State effects:
 * - Updates: approved
 * - May update: status, message (optional, recommended)
 */


type NodeContext = {
    interrupt : (payload: unknown) => Promise<unknown>
}

export async function approveNode(state: State , context : NodeContext) : Promise<Partial<State>>{

    if(state.status === 'cancelled') return {}

    // Planned steps that require user approval
    const steps = state.steps ?? []

    if (steps.length === 0){
        return {
            approved: true,
            message: "there is no steps to approve"
        }
    }

    /**
   * interrupt is provided by LangGraph at runtime.
   *
   * Calling interrupt(payload):
   * - Pauses the graph execution
   * - Sends payload to the outside world (UI / API)
   * - Resumes execution when the UI responds
   */
    const interrupt = context?.interrupt as (payload: unknown) => Promise<unknown>;

    // Normalize the decision into a boolean.
    const decision = await interrupt({
        type: 'approval_request',
        steps
    })

    const approved = typeof decision === "object" && decision !== null && "approve" in decision
        ? Boolean((decision as any).approve)
        : Boolean(decision);


    if (!approved) {
        return { approved: false, status: "cancelled", message: "User rejected the plan." };
    }

    return { approved: true, message: "Plan approved. Proceeding to execution." };

}
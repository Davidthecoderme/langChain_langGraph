import { State } from "../types";


/**
 * finalizeNode
 *
 * Role (what this node is for):
 * - This is the LAST node in the graph.
 * - It produces a final "summary state" that the UI can display.
 * - It decides the final status ("done" vs "cancelled") and ensures
 *   message/steps/results are present in the returned update.
 *
 * Why we need it:
 * - Earlier nodes may set partial fields (steps, approved, results, message).
 * - Some paths end early (cancelled / not approved).
 * - This node centralizes the final decision and final output formatting.
 *
 * State reads:
 * - approved: whether the user approved the plan
 * - status: current status from earlier nodes ("planned" | "done" | "cancelled")
 * - steps: the planned steps
 * - results: execution outcomes per step
 * - message: any message produced by earlier nodes (validation, execution, etc.)
 *
 * State writes (returns Partial<State>):
 * - status: final status for the run
 * - message: final user-facing message for the UI
 * - steps: included for UI context
 * - results: included for UI context
 *
 * Notes / invariants:
 * - If status is already "cancelled", we keep it cancelled.
 * - If the plan was NOT approved, we treat the run as cancelled.
 * - Otherwise, we treat the run as done.
 * - This node does NOT generate new plans or execute steps; it only finalizes output.
 */


export async function finalizeNode(state: State): Promise<Partial<State>> {


    const approved = state.approved ?? false;

    const currStatus = state.status;

    const steps = state.steps ?? [];

    const results = state.results ?? [];

    const finalStatus =
        currStatus === "done"
        ? "done"
        : currStatus === "cancelled" || !approved
            ? "cancelled"
            : "done";

    const message =
        state.message ??
        (finalStatus === "cancelled"
        ? "Task was cancelled or not approved."
        : `Task completed successfully with ${steps.length} steps and ${results.length} results.`);

    return {
        status: finalStatus,
        message,
        steps,
        results
    }





}
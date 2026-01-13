
import { Router } from "express";
import {z} from 'zod'
import { resumeAgentRun, startAgentRun } from "../graph/graph";

const router = Router();

/**
 * Request body schemas (runtime validation)
 *
 * Why Zod here?
 * - req.body is untrusted input from outside (UI / network)
 * - Zod prevents invalid payloads from reaching your graph
 */

const StartSchema = z.object({
    input: z.string().min(5 , "input is required")
})

const ApproveSchema = z.object({
    threadId: z.string().min(1 , 'threadId is required'),
    approve: z.boolean()
})



/**
 * POST /start
 *
 * Starts a NEW graph run.
 * Possible outcomes:
 * 1) Graph completes without pausing => return kind="final"
 * 2) Graph pauses at approval node (interrupt) => return kind="approval_request"
 */
router.post('/start' , async (req , res) => {

    const parsed = StartSchema.safeParse(req.body);
    
    if(!parsed.success){
        return res.status(400).json({
            error: "Invalid input: " + JSON.stringify(parsed.error.format())
        })
    }

    try{
        const result = await startAgentRun(parsed.data.input);

         // Case 1: graph finished immediately
        if ('final' in result){
            return res.json({
                status: 'ok',
                data: {
                    kind: 'final',
                    final: result.final,
                }
            })
        }

        // Case 2: graph paused waiting for approval
        if('interrupt' in result){
            return res.json({
                status: 'ok',
                data : {
                    kind : 'needs_approval',
                    interrupt : {
                        threadId : result.interrupt.threadId,
                        steps: result.interrupt.steps,
                        prompt: 'Approve the generated plan to execute or reject'
                    }
                }
            })
        }
        return res.status(500).json({
            status:'error',
            error: 'something is wrong here'
        })

    }catch(err){
        console.error("❌ /agent/start failed:", err);
        return res.status(500).json({
            error: 'error occured'
        })
    }

})

/**
 * POST /approve
 *
 * Resumes an INTERRUPTED graph run using threadId.
 * The UI calls this after user clicks approve/reject.
 *
 * It passes:
 * - threadId: identifies which paused run to resume
 * - approve: the user's decision
 *
 * Graph continues from interrupt and returns the final state.
 */
router.post('/approve' , async (req, res) => {
    const parsed = ApproveSchema.safeParse(req.body);

    if(!parsed.success){
        return res.status(400).json({
             error: "Invalid input: " + JSON.stringify(parsed.error.format())
        })
    }

    try{

        const {threadId , approve} = parsed.data;

        const result = await resumeAgentRun({ threadId, approve });

        return res.json({
            status: 'ok',
            data:{
                kind: 'final',
                result
            }
        })
    }catch(err){
        if (err instanceof Error && err.message === "INVALID_THREAD_ID") {
            return res.status(404).json({
                status: "error",
                error: "Invalid or expired threadId (no saved checkpoint). Start a new run.",
            });
        }

        console.error("approve failed:", err);
            return res.status(500).json({ status: "error", error: "some error occured" });
        }
})

export default router;

import {Router} from 'express'
import * as z from 'zod'
import { ingestText } from '../light_rag_kb/ingest';
import { resetStore } from '../light_rag_kb/store';

export const kbRouter = Router();

const IngestBody = z.object({
    text:z.string().min(1 , "text is required"),
    source: z.string().optional(),
})

type IngestBody = z.infer<typeof IngestBody>; 

kbRouter.post('/ingest' , async (req , res) => {
    try{
        const body = IngestBody.parse(req.body) as IngestBody;
        
        const result = await ingestText({
            text: body.text,
            source: body.source,

        })

        return res.status(200).json({
            ok: true,
            ... result
        })
    }catch{
        res.status(400 ).json({
            error:" failed to ingest text"
        })
    }
});

kbRouter.post('/reset' , async (_req, res)=>{
    resetStore();
    return res.status(200).json({
        ok:true,
        cleared: true
    })
})

const Ask_Body = z.object({
    query : z.string().min(3 , "please ask a complete query"),
    k: z.number().min(1).max(10).optional()
})

type AskBody = z.infer<typeof Ask_Body>;    

kbRouter.post('/ask' , async ( req , res) => {
    try{
        const body = Ask_Body.parse(req.body) as AskBody; 
        const { askKB } = await import('../light_rag_kb/ask');

        const result = await askKB(body.query , body.k ?? 2);   
        return res.status(200).json({
            answer: result.answer,
            sources: result.sources,
            confidence: result.confidence
        })
    }catch(err){
        console.error("Error in /ask:", err);
        res.status(400).json({      
            error: "failed to get answer from KB"
        })
    }   
})

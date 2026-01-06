
// ask the kb -> retrieval + ans 

import { StringLiteralType } from "@langchain/classic/output_parsers/expression"
import { getVectorStore } from "./store";
import { kh } from "zod/locales";
import { getChatModel } from "../shared/models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

// ==============================
// KB RAG: Retrieval + Answer
// ==============================
//
// (What this module does):
// This module implements a basic RAG flow for asking a Knowledge Base (KB):
//   1) Embed the user query (turn text -> vector)
//   2) Retrieve top-k most similar chunks from a vector store
//   3) Build a "context" string (quoted chunks + source metadata)
//   4) Ask the LLM to answer using ONLY the provided context
//   5) Return answer + sources + a simple confidence score\

// 这是一个最基础的 RAG（检索增强生成）问答模块：
//   1）把用户问题 embedding 成向量（文字 -> 数字数组）
//   2）在向量库里检索最相关的 top-k chunks
//   3）把检索到的 chunks 拼成 context（带编号 + 来源信息）
//   4）让大模型只基于 context 回答（找不到就说找不到）
//   5）返回 answer + sources + confidence
//

export type KBsource = {
    source: string;
    chunkId: number;
}

export type KBAskResult = {
    answer: string,
    sources : KBsource[];
    confidence: number; // 0 to 1
}


// Convert retrieved chunks into a single string "context" to feed into the LLM.
function buildContext(chunks:{text:string, meta: any}[]){
    return chunks.map(({text,meta } , index) => [
        `[#${index+1}] ${String(meta?.source ?? "unknown")} #${String(meta?.chunkId ?? "?")}`,
        text ?? "Empty text"
    ].join("\n")).join("\n\n---\n\n")

}


// Ask the model to answer the question using ONLY the provided context.
async function buildFinalAnswerFromLLM(query: string, context: string){
    const model = getChatModel({temperature:0.2});

    const res = await model.invoke([
        new SystemMessage([
                "You are a helpful assistant, answer only using the provided context",
                "if the answer is not found in the current context, just let me know about this",
                "Be concise: 4-5 sentences, neutral and avoid any marketing info",
                "do not fabricate sources or cite anything that is not in the text"
            ].join("\n")),
        new HumanMessage([
            `Question: \n${query}`,
            "",
            "Context: (quoted chunks)",
            context || "no relevant context"
        ].join("\n"))
    ])

    const finalRes = typeof res.content === 'string' ? res.content : String(res.content);

    return finalRes.trim().slice(0 , 1500);

}

// Compute a simple confidence score from retrieval scores.
function buildConfidence(scores:number[]){
    if(!scores.length) return 0;

    const clamped = scores.map(score=> Math.max(0 , Math.min(1 , score)));

    const avg = clamped.reduce((sum , cur) => sum + cur , 0) / clamped.length;

    return Math.round(avg * 100) / 100 ; //retrun two decimal places
}   



// askKB (main entry)
// ------------------------------
// EN:
// Main RAG function:
//   1) validate query
//   2) embed query
//   3) retrieve top-k chunks with scores
//   4) build context
//   5) LLM answers using context
//   6) return answer + sources + confidence
//
export async function askKB(query:string , k = 2 ): Promise<KBAskResult>{
    const validateCurrentQuery = (query ?? "").trim();

    if(!validateCurrentQuery){
        throw new Error("Please try again!");
    }

    const store = getVectorStore();

    //embed the query -> vector (array of numbers)

    const embedQuery = await store.embeddings.embedQuery(validateCurrentQuery);

    // Retrieve top-k most similar chunks and their scores , pairs shape ~ [ [Document, score], [Document, score], ... ]
    const pairs = await store.similaritySearchVectorWithScore(embedQuery,k);

    // Convert Documents into simpler {text, meta} objects
    const chunks = pairs.map( ([doc]) => (
        {
            text: doc.pageContent || "",
            meta: doc.metadata || {}
        }
    ) )

     // Extract scores for confidence calculation
    const scores = pairs.map(([_ , score])=> Number(score) || 0 );

    //prompt context 
    const context = buildContext(chunks);

    const answer = await buildFinalAnswerFromLLM(validateCurrentQuery , context);
    
    // Build sources list from chunk metadata
    const sources : KBsource[] = chunks.map((c)=> ({
        source: String(c.meta?.source ?? "unknown"),
        chunkId: Number(c.meta?.chunkId) ?? 0
    }));

     // Heuristic confidence from retrieval scores
    const confidence = buildConfidence(scores);

    // Return final KB answer + sources + confidence
    return {
        answer,
        sources,
        confidence
    }
}
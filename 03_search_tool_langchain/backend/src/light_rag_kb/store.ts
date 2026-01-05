
// embeddings + vector store 
// kb brain -> knowledge base 
// picks an embedding model => gemini or others 
// store the embedding in ram 
// letting us insert chunks and later run search based on those chunks 

/** 
 * core concepts : embedding modle 1 .turn the text to array of numbers
 *                                 2. diff providers use diff vector spaces                         
 * 
 * vector store: searchable index 
 */ 


import { OpenAIEmbeddings } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { TaskType } from "@google/generative-ai";
import { MemoryVectorStore } from "@langchain/classic/vectorstores/memory";
import { Document } from "@langchain/classic/document";

type Provider = "google" | "openai";

function getProvider(): Provider {
    const getCurrentProvider = (process.env.RAG_MODEL_PROVIDER ?? "gemini").toLowerCase();
    
    return getCurrentProvider === "gemini" ? 'google' : 'openai';

}

// create embeddings client 

function makeOpenAiEmbeddings(){
    const key = process.env.OPENAI_API_KEY ?? ""
    if (!key){
        throw new Error("Openai API key is missing")

    }

    return new OpenAIEmbeddings({
        apiKey: key,
        model: 'text-embedding-3-small'
    })
}

function makeGoogleEmbeddings(){
    const key = process.env.GOOGLE_API_KEY ?? ""
    if (!key){
        throw new Error("Google API key is missing")

    }

    return new GoogleGenerativeAIEmbeddings({
        apiKey: key,
        model: 'gemini-embedding-001',
        taskType: TaskType.RETRIEVAL_DOCUMENT
    })
}


function makeEmbeddings(provider: Provider){
    return provider === 'google' ? makeGoogleEmbeddings() : makeOpenAiEmbeddings();
}

// vector store 

let store : MemoryVectorStore | null = null; 
let currentSetProvider : Provider | null = null;

export function getVectorStore(): MemoryVectorStore{
    const provider = getProvider();

    if(store && currentSetProvider == provider){
        return store
    } 

    // if the provider changed or first time call -> to build a brand new provider
    store = new MemoryVectorStore(makeEmbeddings(provider));

    currentSetProvider = provider ;

    return store
}

export async function addChunks(docs: Document[]) : Promise<number>{
    if(!Array.isArray(docs) || docs.length === 0) return 0;

    const store = getVectorStore();

    await store.addDocuments(docs)

    return docs.length;

}

export function resetStore(){
    store= null ;
    currentSetProvider = null;
}

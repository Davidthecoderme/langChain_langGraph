/**
 * Why this exists:
 * - LLMs are good at writing answers, but not good at searching large documents by themselves.
 * - So we first build a searchable "knowledge index" from documents (RAG).
 *
 * Pipeline A — Ingestion / Indexing (prepare knowledge base):
 * 1) Chunking:
 *    - Split the input text into small, overlapping chunks to preserve context.
 * 2) Embedding:
 *    - Turn each chunk into a numeric vector (embedding) using a provider (OpenAI / Gemini).
 * 3) Vector Store:
 *    - Store vectors in MemoryVectorStore so we can later do semantic search.
 *
 * What the UI gets back:
 * - docCount: how many documents were ingested (here typically 1 per call)
 * - chunkCount: how many chunks were created and stored
 * - source: where the text came from (file name, URL, pasted text, etc.)
 *
 * Pipeline B — Retrieval / Answering (use knowledge):
 * 1) Embed the user's question into a vector.
 * 2) Similarity search: find the top-K most similar chunks.
 * 3) Provide those chunks as context to the LLM so the answer is grounded in the source text.
 */



import { chunkText } from "./chunk";
import { addChunks } from "./store";

export type IngestTextInput = {
    text: string,
    source? : string;
}

export async function ingestText(input: IngestTextInput){
    const raw = (input.text ?? "").trim() ;

    if(!raw){
        throw new Error("no file to ingest");
    }

    const source = input.source ?? "pasted-text";

    const docs = chunkText(raw, source);

    // embed and add to created vector store
    const chunkCount = await addChunks(docs);

    return {
        docCount: 1,
        chunkCount,
        source,
    }

}
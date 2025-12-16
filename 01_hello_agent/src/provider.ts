// Small helpers that call two different LLM provider endpoints
// and return a uniform `HelloOutput` shape. Comments are kept
// short for readability.

import { error } from "node:console";

// Supported provider IDs
type Provider = 'gemini' | 'groq';

// Standardized output from each provider helper
type HelloOutput = {
    ok: true;
    provider: Provider;
    model: string;
    message: string;
}

// Partial typing for Gemini's generateContent response
type GeminiGenerateContent = {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
}

// Call Gemini API and return a short hello message
async function helloGemini(): Promise<HelloOutput> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error('Api key is not present');

    const model = "gemini-2.0-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
        method: 'post',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: 'Say a short Hello' }] }]
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini ${response.status}: ${await response.text()}`);
    }

    const json = (await response.json()) as GeminiGenerateContent;
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? 'Hello as default';

    return {
        ok: true,
        provider: 'gemini',
        model,
        message: String(text).trim()
    };
}

// Partial typing for OpenAI/Groq style chat completion response
type OpenAiChatCompletion = {
    choices?: Array<{ message?: { content?: string } }>
}

// Call Groq's chat completions endpoint and return a short hello
async function helloGroq(): Promise<HelloOutput> {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error("Groq api key is not present!");

    const model = "llama-3.1-8b-instant";
    const url = `https://api.groq.com/openai/v1/chat/completions`;

    const response = await fetch(url, {
        method: 'post',
        headers: {
            'Content-type': 'application/json',
            Authorization: `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model,
            messages: [{ role: 'user', content: 'say a short hello' }],
            temperature: 0
        })
    });

    if (!response.ok) {
        throw new Error(`Groq ${response.status}: ${await response.text()}`);
    }

    const json = (await response.json()) as OpenAiChatCompletion;
    const content = json.choices?.[0]?.message?.content ?? 'hello as default';

    return {
        ok: true,
        provider: 'groq',
        model,
        message: String(content).trim()
    };
}

export async function selectAndHello(): Promise<HelloOutput> {

    const forced = (process.env.PROVIDER || "").toLowerCase();

    if (forced == 'gemini') return helloGemini();
    if (forced == 'groq') return helloGroq();

    if (forced) throw new Error(`use wrong provider ${forced}`)
    
    
    if (process.env.GOOGLE_API_KEY) { 
        try {
            return await helloGemini();
        } catch(error) { }
    }
    if (process.env.GROQ_API_KEY) { 
        try {
            return await helloGroq();
        } catch(error) { }
    }

    throw new Error("No provider provided")
 
}

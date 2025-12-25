import { getChatModel } from "../shared/models";
import { SummarizeInputSchema, SummarizeOutputSchema } from "./schema";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

export async function summarize(text: string){


    const {text : raw} = SummarizeInputSchema.parse({text});


    const clipped = raw.slice(0, 4000); // 截断长度，避免 token 爆炸

    const model = getChatModel({temperature: 0.2});


    // aks the model to summarize in a controlled manner 

    const res = await model.invoke([
        new SystemMessage([
            "You are a helpful assistant that summarizes text into concise summaries.",
            "Guidelines:",
            "- Be factual and neutral. do not add your own opinions.",
            "- 5-8 sentences long, no lists unless absolutely necessary.",
            "- Do not invent sources; only summarize what is in the text.",
            "- keep it readalbe and engaging for beginners.",
        ].join('\n')),

        new HumanMessage([
            "Summarize the following content for a biginner friendly audience:",
            "Focus on key facts and remove fluff.",
            "TEXT:",
            clipped
        ].join('\n\n'))

    ]); 

    const rawModeloutput = typeof res.content === 'string' ? res.content : String(res.content);

    const summary = normalizeSummary(rawModeloutput);

    return SummarizeOutputSchema.parse({summary});

}

function normalizeSummary(s: string){
    const t = s.replace(/\s+\n/g , "\n").replace(/\n{3,}/g , "\n\n").trim();
    return t.slice(0 , 2500);

}
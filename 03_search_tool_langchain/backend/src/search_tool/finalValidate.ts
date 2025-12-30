import { candidate } from "./types";
import {RunnableLambda} from "@langchain/core/runnables"
import { searchAnswerSchema } from "../utils/schema";
import { getChatModel } from "../shared/models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";



/**
 * ==============================
 * finalValidateAndPolish
 * ==============================
 * 这是返回给前端之前的“最后一道关卡”。
 * 它保证最终输出一定符合 schema：
 *   { answer: string, source: string[] (URL数组) }
 *
 * 如果第一次校验通过 -> 直接返回。
 * 如果不通过 -> 让 LLM 修复成符合 schema 的 JSON，再校验一次。
 */

export const finalValidateAndPolish = RunnableLambda.from(
    async (candidate: candidate) => {
        const finalDraft = {
            answer: candidate.answer.trim(),
            source: candidate.source ?? [],
        }

        const parse1 = searchAnswerSchema.safeParse(finalDraft);

        if (parse1.success){
            return parse1.data;
        }

        // extra check 修复后再次校验（LLM 也可能修错，所以必须再校验一次）

        const repaired = await reparirSearchAnswer(finalDraft); 

        const parse2 = searchAnswerSchema.safeParse(repaired);
        if (parse2.success) return parse2.data;

        //最终兜底（避免返回 undefined 导致调用端崩）
        return {
            answer: finalDraft.answer,
            source: [],
        };

    }
)

async function reparirSearchAnswer( object : any  ): Promise<{answer: string ; source: string[]}>{
     const model = getChatModel({temperature:0.2});

     const response = await model.invoke(
        [
            new SystemMessage(
                [
                    "you fix the json objects to match a given schema",
                    "Repond only with valid json object",
                    "Schema: {answer: string ; source: string[]}",
                ].join("\n")
            ),
            new HumanMessage(
                [
                    "Make this exactly to schema, ensure source is an array of URL strings",
                    "Input JSON:",
                    JSON.stringify(object),
                ].join("\n")
            )
        ]
    )

    const text = typeof response.content === 'string' ? response.content : String(response.content);
    
    // 从输出文本中“抠出”JSON对象
    const json = extractJson(text);

    return {
        answer: String(json?.answer ?? "").trim(),
        source: Array.isArray(json?.source) ? json?.source?.map(String) : [] 
    }


}

function extractJson( input : string){
    const start = input.indexOf('{');
    const end = input.lastIndexOf('}');

    if(start === -1 || end === -1 || end < start){
        return {}
    }

    const raw  = input.slice(start , end + 1);

    try {
        return JSON.parse(raw );
    } catch {
        // If parse fails, return empty object
        return {};
    }
}
import { AskResult, AskResultSchema } from "./schema";
import { createChatModel } from "./lc-model";

export async function askStructured(query: string) : Promise<AskResult> {
    const {model}  = createChatModel();


    // System Prompt：告诉模型身份与输出要求
    // “只能返回所要求的 JSON”
    const system = "you are a assisstant. Return only the requested JSON.";


    // User Prompt：告诉模型要做什么
    // 目标：
    // 1. 为初学者总结
    // 2. 输入内容是 query
    // 3. 返回字段: summary（短段落），confidence（0~1）
    const user = 
    `Summarized for a binginner:\n` +
    `"${query}"\n `+
    `Return fields: summary(short paragraph), confidence (0 .. 1)`;

    // 关键步骤：
    // 使用 LangChain 的结构化输出能力
    // withStructuredOutput 会要求 LLM 的输出符合 AskResultSchema
    // Schema 不符合会自动重试
    const structured = model.withStructuredOutput(AskResultSchema);


    // 发送消息给模型 才能把真正的 prompt 传进去
    const result = await structured.invoke([
        {
            role:'system' , 
            content: system
        },
        {
            role:'user',
            content: user
        }
    ])

    return result






}
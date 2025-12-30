import { RunnableLambda } from "@langchain/core/runnables";
import { candidate } from "./types";
import { getChatModel } from "../shared/models";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
// cheap mode, dont call 'tavily, fetch or summarize" 

export const directBasePath = RunnableLambda.from(
    async (input : {q: string ; mode: 'web' | 'direct'}) : Promise<candidate>=>{
        const model = getChatModel({temperature:0.2});

        const res = await model.invoke([
            new SystemMessage(
            
                [
                    "You answer briefly and clearly for beginners",
                    "if unsure, say so"

                ].join("\n")

            ),
            new HumanMessage(input.q)
        ]);

        const directAns = (
            typeof res.content === 'string' 
            ? res.content : String(res.content)
        ).trim();

        return ({
            answer: directAns,
            source: [],
            mode: 'direct',
        })
    }
)
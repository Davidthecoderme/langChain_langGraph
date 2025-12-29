import { tr } from "zod/locales";
import { SearchInputSchema } from "../utils/schema";
import { RunnableLambda } from "@langchain/core/runnables";


export function routeStrategy(query: string): "web" | "direct" {
    const trimedQuery = query.trim().toLocaleLowerCase();

    const isLongQuery = trimedQuery.length > 70;

    const recentYearRegex = /\b20(2[4-9]|3[0-9])\b/.test(trimedQuery);
    // this patterns can change based on the tool that u r creating
    const patterns: RegExp[] = [
        /\btop[-\s]*\d+\b/u,
        /\bbest\b/u,
        /\brank(?:ing|ings)?\b/u,
        /\bwhich\s+is\s+better\b/u,
        /\b(?:vs\.?|versus)\b/u,
        /\bcompare|comparison\b/u,

        /\bprice|prices|pricing|cost|costs|cheapest|cheaper|affordable\b/u,
        /\bunder\s*\d+(?:\s*[kK])?\b/u,
        /\p{Sc}\s*\d+/u,

        /\blatest|today|now|current\b/u,
        /\bnews|breaking|trending\b/u,
        /\b(released?|launch|launched|announce|announced|update|updated)\b/u,
        /\bchangelog|release\s*notes?\b/u,

        /\bdeprecated|eol|end\s*of\s*life|sunset\b/u,
        /\broadmap\b/u,

        /\bworks\s+with|compatible\s+with|support(?:ed)?\s+on\b/u,
        /\binstall(ation)?\b/u,

        /\bnear\s+me|nearby\b/u,
    ];

    const isQueryPresentInPatterns = patterns.some(pattern => pattern.test(trimedQuery));

    if(isLongQuery || recentYearRegex || isQueryPresentInPatterns){
        return 'web';
    }else{
        return 'direct';
    }

}

export const routerStep = RunnableLambda.from(async (input : {q:string}) => {
    const {q} = SearchInputSchema.parse(input);

    // decide the mode -> web, direct
    const mode = routeStrategy(q);

    return {q , mode};
})
import { RunnableLambda } from "@langchain/core/runnables";
import { webSearch } from "../utils/webSearch";
import { openUrl } from "../utils/openUrl";
import { summarize } from "../utils/summarize";

// top 10 universities in the world  ? 
// 1 search the web -> 2 visit every result page -> 3 summarize -> 4 return the candidate, sources, mode 




/**
 * 定义了 2 个 LangChain 的“步骤”（Runnable），通常会被串成一个流水线：
 *   1) webSearchStep：用 Tavily 搜索，把搜索结果数组放到 input.results 上
 *   2) openAndSummarizeStep：取前 N 条结果，逐个打开网页并总结，生成 pageSummaries
 *
 * 最终给后续步骤（比如生成最终答案的 LLM）提供：
 *   - pageSummaries: [{ url, summary }, ...]
 *   - fallback: 'none' | 'snippets' | 'no results'
 */



const setTopResults = 5 ;


/**
 * ==============================
 * Step 1: webSearchStep
 * ==============================
 * 
 * 输入： { q, mode }
 * 输出： { q, mode, results }
 *
 * 说明：
 * - 这里的 results 是 Tavily 搜索返回的数组（每条通常有 url/title/snippet）。
 * - 这个 step 只是“搜索”，不打开网页、不总结。
 */

export const webSearchStep = RunnableLambda.from(
    async (input: {q: string, mode:'web' | 'direct'}) =>{
        // 调用 Tavily 搜索工具，得到搜索结果列表
        const results = await webSearch(input.q) // tavily will do the search
        

        // 返回一个新对象：保留原输入字段 + 新增 results
        return {
            ...input,
            results,
        };
    }
);


/**
 * ==============================
 * Step 2: openAndSummarizeStep
 * ==============================
 * 输入： { q, mode, results }  （results 通常来自上一步 webSearchStep 的输出）
 * 输出： { q, mode, results, pageSummaries, fallback }
 *
 * pageSummaries: 每个网页的 “url + summary”
 * fallback:
 *  - 'none'      : 正常，成功打开并总结了至少一个页面
 *  - 'snippets'  : 网页都打不开/总结失败，用搜索的 snippet/title 兜底
 *  - 'no results': 搜索结果为空
 */

export const openAndSummarizeStep = RunnableLambda.from(
    async(input : {q : string, mode: 'web' | 'direct' , results: any[]})=>{
         // 防御式检查：如果 results 不是数组或为空，直接返回，不继续往下跑
        if(!Array.isArray(input.results) || input.results.length === 0){
            return {
                ...input,
                pageSummaries: [],
                fallback: 'no results' as const
            }
        }

        const extractTopResults = input.results.slice(0 , setTopResults);
        

        /**
         * 并发（同时）打开并总结每一个搜索结果。
         * 用 Promise.allSettled 的原因：即使某个网页失败（403/超时），其他网页还能继续成功。
         */
        const settledResults = await Promise.allSettled(
            extractTopResults.map(async (result : any )=>{

                 // 打开网页并清洗内容（HTML 转文本、去掉 nav/script 等噪声、限制长度）
                const opened = await openUrl(result.url);
                
                //把清洗后的正文丢给 LLM 做总结
                const summarizeContent = await summarize(opened.content);

                return {
                    url: opened.url,
                    summary: summarizeContent.summary
                }
            })
        )

        /**
         * 只保留成功的结果（fulfilled）。
         * allSettled 的每一项可能是：
         * - { status:'fulfilled', value: ... } 成功
         * - { status:'rejected',  reason: ... } 失败
         */
        const settledResultsPageSummaries = settledResults.filter(
            settledResults => settledResults.status === 'fulfilled'
        ).map(s=> s.value)

        //edge case: allsettled every case fails
        if(settledResultsPageSummaries.length === 0){
            const fallbackSnippetSummaries = extractTopResults.map( (result: any)=>({
                url: result.url,
                summary: String(result.snippet || result.title || "").trim() 
            })).filter( (x: any) => x.summary.length> 0 )
            return {
                ...input,
                pageSummaries: fallbackSnippetSummaries,
                fallback: 'snippets' as const 
            }
        }
        return {
            ...input, 
            pageSummaries : settledResultsPageSummaries,
            fallback : 'none' as const 
        }
    }
)

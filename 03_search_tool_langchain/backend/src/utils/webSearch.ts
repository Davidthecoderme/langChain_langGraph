// ==============================
// Web search tool
// ==============================
// This module provides a safe web search utility.
// It takes a natural language query, calls Tavily under the hood,
// cleans + validates the response, and returns trusted search results.
// 这是一个“网络搜索工具模块”。 接收自然语言查询 → 调用 Tavily API → 清洗 + 校验数据 → 返回系统内部可以信任的搜索结果（符合 WebSearchResultsSchema）。
// user query → Tavily API → 清洗 + schema 校验 → WebSearchResultsSchema, the core value of this code is not searching, but enforcing trust boundaries
import {env} from '../shared/env'
import { WebSearchResultSchema, WebSearchResultsSchema } from './schema';
import { safeText } from './http';

// ==============================
// Public API: webSearch
// ==============================

// This is the only exported function.
// It acts as a safe entry point for the rest of the system.

// 这是对外暴露的唯一函数。
// 作为系统入口，负责最基本的防御和封装，隐藏内部实现细节。
export async function webSearch(q: string){
    const query = (q?? "").trim();

    if(!query)  return [];

    return await searchTavilUtil(query);

}


// ==============================
// Internal implementation
// ==============================
// Actual Tavily API call implementation.
// Not exported because it is an internal detail.

// 真正调用 Tavily API 的实现细节。
// 不导出，防止外部依赖内部逻辑。

async function searchTavilUtil(query: string){
    if (!env.TAVILY_API_KEY) throw new Error("Tavily api key is not present");


    const response = await fetch(" https://api.tavily.com/search " , {
        method: 'POST',
        headers:{
            'content-type': 'application/json',
            //  Bearer token authentication   使用 Bearer Token 进行鉴权
            Authorization: `Bearer ${env.TAVILY_API_KEY}`
        },
        body: JSON.stringify( {
            query,
            //  Use shallow search to control cost and noise  使用基础搜索，控制成本和噪声
            search_depth: 'basic',
            // Limit results at API level (first line of defense) 中文：在 API 层先限制返回数量（第一道防线）
            include_answer: false,
            include_images: false,
        })
    })

    if(!response.ok){
        const text = await safeText(response )

        throw new Error(`tavily error, ${response.status}- ${text}`)
    }
    // Parse raw JSON from external API (untrusted data) 解析第三方 API 返回的原始 JSON（不可信数据）
    const data =  await response.json();

    // Defensive extraction of results array 防御式读取 results，不假设第三方 API 一定规范
    const results = Array.isArray(data?.results) ? data.results : []


    // - 强制类型归一化 提供默认值  控制字段长度  使用 schema.parse 进行严格校验
    const normalized = results.slice(0,5).map((r : any) => WebSearchResultSchema.parse({
        title: String(r?.title).trim() || 'untitled',
        url: String(r?.url ?? '').trim(),
        snippet: String(r?.snippet ?? '').trim().slice(0,220)
    }))

    return WebSearchResultsSchema.parse(normalized);
}


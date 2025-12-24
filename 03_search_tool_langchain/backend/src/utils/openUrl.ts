

//fetch each and every page
// the LLM itself can not browse the web
// the code is gping to act as a browser tool , and decide decide exactly waht content is safe and what we want the model to show


// we fetch the url, strip all the unnecessary infos, keep exact article like content that we need 


// 在服务器端抓取网页（LLM 不能直接浏览），去掉网页噪声内容，
// 把 HTML 转成纯文本，限制长度，最后用 schema 校验输出格式。

import { safeText } from "./http";
import {convert} from 'html-to-text'
import { OpenUrlOuputSchema } from "./schema";

export async function openUrl(url: string){
    // step 1 验证并规范化 URL，只允许 http/https，防止危险协议（系统安全边界）。
    const normalized = validateUrl(url);

    // step 2 - fetch the page by ourself because LLM can not browse
    //some website block generic node fetch  服务器端去抓网页；有些网站会挡默认请求，加 UA 能降低 403 概率。
    const res = await fetch(normalized,{
        headers:{
            //avoid instant 403 on strict websites 标识请求来源，减少被当成异常机器人拦截
            'User-agent' : 'agent-core/1.0 (+course-demo)'
        }
    })
    // 请求失败时，读一点 body 方便定位原因，然后抛错。
    if(!res.ok){
        const body = await safeText(res);
        throw new Error(`OPenURL failed ${res.status} - ${body.slice(0,220)}`);
    }

    // step 3  content-type 用来判断是不是 HTML；raw 是原始响应内容字符串。
    const contentType = res.headers.get('content-type') ?? '';
    const raw = await res.text();

    // step 4 : html --> plain text  LLM 更适合读“文章式纯文本”，而不是乱七八糟的 HTML。
    const text = contentType.includes('text/html') ? 
    convert(raw, {
        wordwrap : false,  //不自动折行，避免多余换行影响后续处理
        // 跳过导航/页眉/页脚（一般是菜单链接，噪声多）
        selectors: [
            {
                selector: 'nav' , format: 'skip'
            },
            {
                selector: 'header' , format: 'skip'
            },
            {
                selector: 'footer' , format: 'skip'
            },
            {
                selector: 'script' , format: 'skip'
            },
            {
                selector: 'style' , format: 'skip'
            }
        ]
    }) : raw ;

    // step 5  整理空白让文本更可读；截断长度避免页面太长导致 token 爆炸。
    const cleaned = collapseWhiteSpace(text);
    const capped = cleaned.slice(0, 8000);

    return OpenUrlOuputSchema.parse({
        url: normalized,
        content: capped,
    })
}

function validateUrl(url: string){
    try{
        const parsed = new URL(url);
        //https:  只允许 http/https，防止 file:/ftp:/javascript: 等危险协议。
        if(!/^https?:$/.test(parsed.protocol)){
            throw new Error('only http and https urls are allowed');
        }

        return parsed.toString();
    }catch(error){
        throw new Error('Invalid url')
    }
}

function collapseWhiteSpace(s:string){
    // 把连续空白（空格/换行/tab）压成一个空格，保持可读性
    return s.replace(/\s+/g, " ").trim();
}
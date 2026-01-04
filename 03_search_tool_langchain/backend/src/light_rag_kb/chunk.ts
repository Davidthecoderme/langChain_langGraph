import {Document} from "@langchain/core/documents"

// 每个 chunk（文本块）的最大长度（这里是“字符数”，不是单词数 / token 数）
const CHUNK_SIZE = 1000;
// 相邻 chunk 之间重复的长度（重叠部分），用来保留上下文
const CHUNK_OVERLAP = 150 ;

export function chunkText(text: string, source: string) : Document[]{
    const clean = (text ?? "").replace(/\r\n/g , "\n");

    // 结果数组：用于收集所有切出来的 Document
    const docs : Document[] = [];

    // 如果清洗后的文本全是空白（空格/换行等），直接返回空数组
    if(!clean.trim()) return docs;
    
    // 计算每次前进的步长 step
    const step = Math.max(1 , CHUNK_SIZE - CHUNK_OVERLAP);

    let start = 0; 

    let chunkId = 0;

    while(start < clean.length){
        const end = Math.min(clean.length , start + CHUNK_SIZE);

        // remove leading/trailing blank lines
        // 去掉切片两端的空白/换行（避免生成纯空白 chunk）
        const slice = clean.slice(start , end).trim();

        if(slice.length > 0){
            docs.push(
                // Document 的正文内容：用于后续 embedding / 检索
                new Document({
                    pageContent: slice,
                    // metadata：额外信息（不会参与 embedding，但可以用于过滤/定位）
                    metadata: {
                        source, 
                        chunkId,
                    },
                    
                })
            )
             chunkId +=1 ;
        }
        start += step ;
       
    }

    return docs;


} 
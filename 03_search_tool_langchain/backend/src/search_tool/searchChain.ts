import { searchInput } from "../utils/schema";
import { directBasePath } from "./directPipeline";
import { finalValidateAndPolish } from "./finalValidate";
import { routerStep } from "./routeStrategy";
import { webBasePath } from "./webPipeline";
import {RunnableBranch, RunnableSequence} from '@langchain/core/runnables'



/**
 * ==============================
 * LCEL (LangChain Expression Language) Flow 
 * ==============================
 * LCEL 允许你把多个 Runnable 步骤组合成一条可执行流水线（pipeline）。
 * 每一步都是：输入一个对象 -> 返回一个对象。
 * 上一步的输出会自动成为下一步的输入（不用手动传参）。
 *
 * 总流程：
 *   1) routerStep：判断走 web 还是 direct
 *   2) branch：根据 mode 选择执行 webBasePath 或 directBasePath
 *   3) finalValidateAndPolish：把最终输出校验/修复成标准结构 { answer, source }
 */


const branch = RunnableBranch.from<{q: string; mode: 'web' | 'direct' }, any>(
    [
        [(input)=> input.mode === 'web' , webBasePath],  // RunnableBranch 会按顺序检查条件：  如果 input.mode === "web" 就执行 webBasePath
        directBasePath,
    ]
)

/**
 * 这三步按顺序执行：

    routerStep
    输入：{ q }
    输出：{ q, mode }（决定 web 或 direct）

    branch
    输入：{ q, mode }
    输出：执行 webBasePath 或 directBasePath 的结果（candidate）

    finalValidateAndPolish
    输入：candidate
    输出：符合 schema 的最终 { answer, source }
 */
export const searchChain = RunnableSequence.from([
    routerStep,
    branch,
    finalValidateAndPolish
]);


//runSearch: execute the chain
export async function runSearch(input: searchInput){
    //* searchChain 是一个 RunnableSequence 对象，不是 async function。 但 searchChain.invoke(...) 会返回 Promise，因为链里包含异步步骤：所以用await
    return await searchChain.invoke(input);
}

import {z} from 'zod'

export const WebSearchResultSchema = z.object({
    title: z.string().min(1),
    url: z.url(),
    snippet: z.string().optional().default("")
})

export const WebSearchResultsSchema = z.array(WebSearchResultSchema).max(10) ; 

export type WebSearchResult = z.infer<typeof WebSearchResultsSchema>;

export const OpenUrlInputSchema = z.object({
    url: z.url(),
})

export const OpenUrlOuputSchema = z.object({
    url: z.url(),
    content: z.string().min(1)
})

export const SummarizeInputSchema = z.object({
    url: z.url(),
    content: z.string().min(50, 'need a bit more content to summarize'),
    text: z.string().min(1),
})

export const SummarizeOutputSchema = z.object({
    summary: z.string().min(1), 
})

export const SearchInputSchema = z.object({
    q: z.string().min(5, 'query cannot be empty'),
})

export type searchInput = z.infer<typeof SearchInputSchema>; 



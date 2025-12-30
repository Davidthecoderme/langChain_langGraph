import {Router} from 'express'
import { SearchInputSchema } from '../utils/schema'
import { runSearch } from '../search_tool/searchChain'

export const SearchRouter = Router()


SearchRouter.post('/' , async(req ,res) =>{
    try{
        const input = SearchInputSchema.parse(req.body)

        const result = await runSearch(input);

        res.status(200).json(result);

    }catch(err){
        const errorMessage = (err as Error)?.message ?? 'Error occured'
        res.status(400).json({error: errorMessage})
    }
})
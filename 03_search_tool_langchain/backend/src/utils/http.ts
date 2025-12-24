

export async function safeText(res:Response){
    try{
        return await res.json()
    }catch(err){    
        return "<no body>"
    }
}
import { NextResponse } from "next/server"


const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000'


// POST handler for this API route 当客户端发送 POST 请求时，这个函数会被调用
export async function POST(req: Request){
    try{

        const body = await req.json()
        // Forward the request to the backend server  将请求转发给真正的后端服务器
        const apiResponse = await fetch( `${BACKEND_URL}/ask` , {
            method: "POST",
            headers:{
                'content-type': 'application/json'
           },
           body: JSON.stringify(body)
        } )
        

        // Return backend response to frontend  将后端的响应返回给前端，并保持相同的状态码
        const data = await apiResponse.json()

        return NextResponse.json(data , {status: apiResponse.status});

    }catch(err: any){
        return NextResponse.json({
            error: `error aoccured ${err.message || String(err)}`
        })
    }
}
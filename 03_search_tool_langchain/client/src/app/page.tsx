'use client'

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { API_URL } from "@/lib/config";
import Link from "next/link";
import { env } from "process";
import { useRef, useState,useEffect, FormEvent } from "react";

type SearchResponse = {
  answer: string;
  source: string[];
}

type CurrentChatTurn = 
| {
  role: 'user',
  content: string,
}
| {
  role: 'assistant',
  content: string,
  source: string[],
  time: number,
  error?: string,
}

export default function Home() {
  const [query , setQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const[chat, setChat] = useState<CurrentChatTurn[]>([]);

  const scrollRef = useRef<HTMLDivElement | null>(null);



  useEffect(()=>{
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth'
    })
  }, [chat])

  async function runSearch(prompt: string){
    setLoading(true)
    setChat((old) => [...old, {role: 'user' , content: prompt}])

    const oldTime = performance.now();

    try{
      const res= await fetch( `${API_URL}/search` , {
        method: "POST",
        headers: {
          "Content-type" : "application/json",
        },
        body: JSON.stringify({q:prompt})
      })
      console.log("API_BASE =", API_URL);

      const json = await res.json();

      const currentTimeDiff = Math.round(performance.now() - oldTime);

      // error handling 

      if(!res.ok){
        const message= "Request failed"
        setChat( old=> [
          ...old, 
          {
            role: 'assistant',
            content: "something was wrong, please try again",
            source: [],
            time: currentTimeDiff,
            error: message
          }
        ])
      } else {
        const data = json as SearchResponse
        setChat( old => [
          ...old,
          {
            role: 'assistant',
            content: data.answer,
            source: data.source,
            time: currentTimeDiff,
          }
        ])
      }
    }
    catch(err){
      const message= "Request failed";
      const currentTimeDiff = Math.round(performance.now() - oldTime);
      setChat( old=> [
          ...old, 
          {
            role: 'assistant',
            content: "something was wrong, please try again",
            source: [],
            time: currentTimeDiff,
            error: message
          }
        ])

    }finally{
      setLoading(false)
    }
  }

  async function handleChatSubmit(e: FormEvent){
    e.preventDefault()
    const prompt = query.trim()

    if(!prompt || loading) return 

    setQuery('')

    await runSearch(prompt)
  }
   




  return <div className="flex h-dvh flex-col bg-[#f9fafb] text-gray-800 ">
     <header className="border-b bg-white px-4 py-3 text-sm flex items-center justify-between">
      <div className="flex flex-col">
        <span className="font-medium text-gray-800">
          Search V1 (LCEL Web Agent)
        </span>
        <span className="text-[11px] text-gray-500">
          Answer with sources, might from other web by browsing. 
        </span>
      </div>
     </header>

     <main  className="flex-1 over-flow-y-auto px-4 py-6 space-y-6">
      {
        chat.length === 0 && (
          <div className="mx-auto max-2-2xl text-center text-sm text-gray-500">
            <div className="text-base font-semibold text-gray-800 mb-1">
              Ask anything
            </div>
            <div className="text-[14px] leading-relaxed">
              Examples: 
              <br />
              <code className="rounded bg-gray-100 px-1 py-2 text-[12px]">
                Top 10 university in the world in 2025
              </code>
              
            </div>
          </div>
        )
      }
      {
        chat.map((turn, idx) =>{
          // user role
          if(turn.role ==='user'){
            return <div className="mx-auto max-w-2xl justify-end text-right" key={idx}>
              <div className="inline-block rounded-2xl bg-gray-900 px-4 py-3 text-sm text-white shadow-md max-w-full">
                <div className="whitespace-pre-wrap wrap-break-word">
                  {turn.content}
                </div>
              </div>
            </div>
          }
          // assistant
          return <div key={idx} className="mx-auto max-w-2xl flex items-start gap-3 text-left">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-gray-800 text-[11px] text-white font-semibold">
              AI
            </div>
            <div className="flex-1 space-y-3 ">
              <div className="inline-block rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 whitespace-pre-wrap wrap-break-word">
                {turn.content}
              </div>
              <div className="text-[11px] text-gray-500 flex flex-wrap items-center gap-x-2">
                {
                  typeof turn.time === 'number' &&(
                    <span>answerd in {turn.time} time</span>
                  )
                }
                {
                  turn?.error && <span>{turn.error}</span>
                }
              </div>

              {
                turn.source && turn.source.length> 0 && (
                  <div className="rounded-lg bg-white px-3 py-2 text-[12px] shadow-sm ring-1 ring-gray-200" >
                    <div className="text-[11px] font-medium text-gray-600 mb-1">
                      Sources
                    </div>
                    <ul className="space-y-1">
                      {
                        turn.source.map((source, idx) =>(
                          <li key={idx} className="truncate">
                            <Link 
                            href={source} 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-blue-500 underline underline-offset-4 break-all"
                            >
                              {source}
                            </Link>
                          </li>
                        ))
                      }
                    </ul>
                  </div>
                )
              }

            </div>
          </div>
        })
      }
      {
        loading && (
          <div className="mx-auto max-w-2xl flex items-start gap-3 text-left">
            <div className="flex h-8 w-8 flex-none items-center justify-center rounded-md bg-gray-700 text-[11px] font-semibold text-white">
              ...
            </div>
            <p className="inline-block rounded-2xl bg-white px-4 py-3 text-sm text-gray-900 shadow-sm ring-1 ring-gray-200 whitespace-pre-wrap wrap-break-word">Thinking </p>
          </div>
        )
      }


      <footer className="border-t bg-white px-4 py-4" >
        <form onSubmit={handleChatSubmit} className="mx-auto flex w-full max-w-2xl items-end gap-2" >
          <div >
            <Input 
            className="w-full resize-none" 
            placeholder="Ask Your Query:" 
            value = {query}
            onChange = {event=>setQuery(event.target.value) } 
            disabled={loading}
            />
          </div>
          <Button className="shrink-0" disabled={loading || query.trim().length <5} type="submit" >
            {loading ? "..." :  "Send"} 
          </Button>
        </form>

      </footer>

     </main>


  </div> ;
}

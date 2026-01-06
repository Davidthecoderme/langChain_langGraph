'use client'
import { useState, FormEvent } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { API_URL } from "@/lib/config";


type Source = {
  source: string;
  chunkId: number;
};

type AskResponse = {
  answer: string;
  sources: Source[];
  confidence: number;
};

type IngestResult = {
  ok: boolean;
  docCount: number;
  chunkCount: number;
  source: string;
};



export default function LightRAGKBPage(){
    const [ingestSource, setIngestSource] = useState("");
    const [ingestText, setIngestText] = useState("");
    const [ingestLoading, setIngestLoading] = useState(false);
    const [ingestMsg, setIngestMsg] = useState("");

    const [question, setQuestion] = useState("");
    const [topK, setTopK] = useState(2);

    const [askLoading, setAskLoading] = useState(false);
    const [time, setTime] = useState<number | null>(null);

    const [answerData, setAnswerData] = useState<AskResponse | null>(null);
    const [showSources, setShowSources] = useState(true);


    async function handleIngest(event: FormEvent) {
        event.preventDefault();
        setIngestLoading(true);
        setIngestMsg("");  
        try{
            const res = await fetch(`${API_URL}/kb/ingest`, {
                method : 'POST',
                headers: {
                    'Content-Type' : 'application/json',
                },
                body: JSON.stringify({
                        text: ingestText,
                        source: ingestSource || undefined
                })
            }) 
            const json : IngestResult | {error : string} = await res.json();
        

            if(!res.ok){
                throw new Error('injest failed');
            }

            const result = json as IngestResult

            setIngestMsg(`Ingested ${result.chunkCount} from ${result.source} `)
        }catch(e){
            console.log(e);
        }finally {
            setIngestLoading(false);
        }

    }

    async function handleAskQuerySubmit(event: FormEvent) {
        event.preventDefault();
        setAskLoading(true);
        setAnswerData(null);
        setTime(null);

        const time = performance.now();

        try {
        const res = await fetch(`${API_URL}/kb/ask`, {
            method: "POST",
            headers: {
            "Content-Type": "application/json",
            },
            body: JSON.stringify({
            query: question,
            k: topK,
            }),
        });

        const json: AskResponse | { error: string } = await res.json();
        if (!res.ok) {
            throw new Error("Ask failed");
        }

        setAnswerData(json as AskResponse);
        } catch (e) {
        console.log(e);
        } finally {
        setTime(Math.round(performance.now() - time));
        setAskLoading(false);
        }
    }

    return (
  <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-muted/40 via-background to-background">
    <div className="mx-auto max-w-5xl px-4 py-10 flex flex-col gap-8">
      {/* Hero */}
      <header className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-2">
            <div className="inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
                <span className="text-sm font-semibold text-primary">KB</span>
              </span>
              <h1 className="text-3xl font-semibold tracking-tight">
                Knowledge Base
                <span className="ml-2 text-muted-foreground text-xl font-medium">
                  (Light RAG)
                </span>
              </h1>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[60ch]">
              Light RAG Demo. Add your docs, then ask questions. The model should
              answer from what you ingested.
            </p>
          </div>

          {/* small right-side hint */}
          <div className="hidden sm:flex flex-col items-end gap-2">
            <div className="rounded-2xl border bg-background/70 px-3 py-2 text-xs text-muted-foreground shadow-sm backdrop-blur">
              Tip: Ingest first, then ask
            </div>
          </div>
        </div>

        {/* Chips */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            ⚡ Fast feedback
          </span>
          <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            🔒 Your data stays local
          </span>
          <span className="inline-flex items-center rounded-full border bg-background/70 px-3 py-1 text-xs text-muted-foreground shadow-sm backdrop-blur">
            🧠 RAG with sources
          </span>
        </div>
      </header>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left card */}
        <Card className="flex flex-col rounded-2xl border-muted/60 bg-background/70 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20">
                1
              </span>
              Add to KB
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleIngest} className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Source Label
                </label>
                <Input
                  placeholder="e.g. onboarding-notes.md"
                  className="h-11 rounded-xl text-sm bg-background focus-visible:ring-2 focus-visible:ring-primary/40"
                  value={ingestSource}
                  onChange={(event) => setIngestSource(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Text / Markdown
                </label>
                <Textarea
                  value={ingestText}
                  onChange={(event) => setIngestText(event.target.value)}
                  className="min-h-[240px] rounded-xl bg-background font-mono text-xs leading-relaxed resize-y focus-visible:ring-2 focus-visible:ring-primary/40"
                  placeholder="Paste docs, policy text or any onboarding notes..."
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-10 rounded-xl"
                >
                  Reset
                </Button>
                <Button type="submit" className="h-10 rounded-xl shadow-sm">
                  {ingestLoading ? "Ingesting..." : "Ingest to KB"}
                </Button>
              </div>
            </form>

            <div className="text-xs">
              {ingestMsg ? (
                <div className="rounded-xl border border-green-500/20 bg-green-500/10 px-3 py-2 text-green-700">
                  {ingestMsg}
                </div>
              ) : (
                <div className="rounded-xl border bg-muted/20 px-3 py-2 text-muted-foreground">
                  Add a source + text, then click <span className="font-medium text-foreground">Ingest</span>.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Right card */}
        <Card className="flex flex-col rounded-2xl border-muted/60 bg-background/70 shadow-sm backdrop-blur hover:shadow-md transition-shadow">
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold ring-1 ring-primary/20">
                2
              </span>
              Ask the KB
            </CardTitle>
          </CardHeader>

          <CardContent className="flex flex-col gap-5">
            <form
              onSubmit={handleAskQuerySubmit}
              className="flex flex-col gap-4"
            >
              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Your Query
                </label>
                <Input
                  placeholder="e.g. What is the refund policy?"
                  className="h-11 rounded-xl text-sm bg-background focus-visible:ring-2 focus-visible:ring-primary/40"
                  value={question}
                  onChange={(event) => setQuestion(event.target.value)}
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                  Top K Answers
                </label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  className="h-11 rounded-xl text-sm bg-background focus-visible:ring-2 focus-visible:ring-primary/40"
                  value={topK}
                  onChange={(event) =>
                    setTopK(parseInt(event.target.value || "2", 5))
                  }
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" className="h-10 rounded-xl shadow-sm">
                  {askLoading ? "Asking..." : "Ask KB"}
                </Button>

                {/* tiny hint pill */}
                <span className="text-xs text-muted-foreground">
                  returns answer + sources
                </span>
              </div>
            </form>

            {/* Result / Empty state */}
            {answerData ? (
              <div className="flex flex-col gap-4 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Result
                  </span>
                  <span className="text-xs text-muted-foreground">
                    Time <span className="font-medium text-foreground">{time}ms</span>
                  </span>
                </div>

                <div className="rounded-2xl border bg-muted/25 p-4 text-sm leading-relaxed whitespace-pre-wrap shadow-inner">
                  {answerData.answer}
                </div>

                {showSources && (
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-medium">
                      Sources{" "}
                      <span className="text-muted-foreground">
                        ({answerData.sources.length})
                      </span>
                    </span>
                    <Separator className="bg-muted/70" />
                    <ul className="space-y-2">
                      {answerData.sources.map((source, index) => (
                        <li
                          key={index}
                          className="rounded-xl border bg-background px-3 py-2 text-xs"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-medium text-foreground truncate">
                              {source.source}
                            </span>
                            <span className="shrink-0 rounded-full border bg-muted/30 px-2 py-0.5 text-[11px] text-muted-foreground">
                              #{source.chunkId}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border bg-muted/20 p-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 ring-1 ring-primary/20" />
                  <div className="flex flex-col gap-1">
                    <div className="font-medium text-foreground">
                      No results yet
                    </div>
                    <div className="text-xs leading-relaxed">
                      Ingest something on the left, then ask a question here.
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted/30 transition-colors"
                    onClick={() => setQuestion("Summarize what I ingested.")}
                  >
                    Summarize my docs
                  </button>
                  <button
                    type="button"
                    className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted/30 transition-colors"
                    onClick={() => setQuestion("List the key points and give citations.")}
                  >
                    Key points + sources
                  </button>
                  <button
                    type="button"
                    className="rounded-full border bg-background px-3 py-1 text-xs hover:bg-muted/30 transition-colors"
                    onClick={() => setQuestion("What are the most important rules in this document?")}
                  >
                    Important rules
                  </button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  </div>
);

}
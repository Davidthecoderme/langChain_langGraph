
import AgentRouter from './routes/graph'

import express from 'express'
import cors from 'cors'
import { env } from './utils/env'

const app = express()

app.use(express.json())

app.use(cors({
    origin: env.ALLOWED_ORIGIN,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    credentials:false
}))

app.use('/agent' , AgentRouter);
app.listen( env.PORT, ()=>{
    console.log(`server is running on port ${env.PORT}`)
} )




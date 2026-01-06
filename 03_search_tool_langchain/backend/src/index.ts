import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { SearchRouter } from './routes/search_lcel';
import { kbRouter } from './routes/rag_kb';

const app = express();

app.use(
    cors({
        origin: process.env.ALLOWED_ORIGIN
    }
        
    )
)


app.use(express.json());

app.use('/search' , SearchRouter);
app.use('/kb' , kbRouter)

const port = process.env.PORT;

app.listen(port , ()=>{
    console.log(`server is running on port ${port}`);
})
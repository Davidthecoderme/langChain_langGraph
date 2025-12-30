import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import { SearchRouter } from './routes/search_lcel';

const app = express();

app.use(
    cors({
        origin: process.env.ALLOWED_ORIGIN
    }
        
    )
)


app.use(express.json());

app.use('/search' , SearchRouter);

const port = process.env.PORT;

app.listen(port , ()=>{
    console.log(`server is running on port ${port}`);
})
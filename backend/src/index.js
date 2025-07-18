

import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';
import scrapeRouter from './routes/scrape.js';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/scrape', scrapeRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});


import express from 'express';
import dotenv from 'dotenv';
import routes from './routes/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use('/', routes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

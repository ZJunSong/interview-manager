import express from 'express';
import cors from 'cors';
import path from 'path';
import routes from './routes';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use('/api/interviews', routes);

// Serve static frontend files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..')));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

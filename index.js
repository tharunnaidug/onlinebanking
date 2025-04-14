import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import setupRoutes from './utils/setup.js';
import authRoutes from './routes/authRoutes.js';
import transferRoutes from './routes/transferRoutes.js';

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/user', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', setupRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/transfer", transferRoutes);


app.get('/', (req, res) => {
  res.send('Online Banking API is running... Welcome to Online Backing System');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server started on http://localhost:${PORT}`);
});
import express from 'express';
import { createServer } from "http";
import { Server } from "socket.io";
import cors from 'cors';
import dotenv from 'dotenv';
import { serialController } from './controllers/serialController.js';

dotenv.config();

const PORT = process.env.PORT || 4000; // Nuevo puerto exclusivo para esta app

const app = express();
const appServer = createServer(app);

const corsOptions = {
  origin: '*', // Puedes restringir según sea necesario
  methods: ['GET', 'POST'],
  credentials: false
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/scsmx', (req, res) => {
  res.send('🎯 Backend operativo en /scsmx');
});

const io = new Server(appServer, {
  path: '/scsmx/socket.io',
  cors: corsOptions
});

// Solo el controlador serial
serialController(io, appServer);

// Inicia el servidor
appServer.listen(PORT, () => {
  console.log(`🚀 Servidor serial en puerto ${PORT}`);
});

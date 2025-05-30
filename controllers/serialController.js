import { WebSocketServer } from 'ws';

export const serialController = (io, httpServer) => {
  const wsServer = new WebSocketServer({ noServer: true }); // Puerto del WebSocket para Python

  // Manejar handshake en ruta personalizada
  httpServer.on('upgrade', (req, socket, head) => {
    const { url } = req;
    if (url === '/scsmx/ws') {
      wsServer.handleUpgrade(req, socket, head, (ws) => {
        wsServer.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  wsServer.on('connection', (ws, req) => {
    console.log('🐍 Cliente Python conectado por WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('📥 Datos desde Python:', data);

        const { idPesa, pesoBruto, pesoNeto } = data;

        if (!idPesa) return;

        // Emitir al frontend vía Socket.IO
        io.to(idPesa).emit('weightData', {
          Brut: pesoBruto,
          pesoNeto: pesoNeto,
        });
      } catch (err) {
        console.error('❌ Error procesando mensaje WebSocket:', err.message);
      }
    });

    ws.on('close', () => {
      console.log('🔌 Cliente Python desconectado');
    });
  });

  // Manejar suscripciones de los clientes frontend
  io.on('connection', (socket) => {
    console.log('🧑 Cliente frontend conectado vía Socket.IO');

    socket.on('joinPesa', (idPesa) => {
      console.log(`📡 Cliente se unió a la pesa: ${idPesa}`);
      socket.join(idPesa);
    });

    socket.on('disconnect', () => {
      console.log('❌ Cliente frontend desconectado');
    });
  });
};

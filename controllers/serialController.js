import { WebSocketServer } from 'ws';

export const serialController = (io, httpServer) => {
  const wsServer = new WebSocketServer({ noServer: true }); // Puerto del WebSocket para Python

  const pesaData = {}

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
    console.log('Cliente conectado por WebSocket');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message);
        console.log('Datos:', data);

        processReceivedData(data);

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
    console.log('Cliente frontend conectado vía Socket.IO');

    socket.on('joinPesa', (idPesa) => {
      console.log(`📡 Cliente se unió a la pesa: ${idPesa}`);
      socket.join(idPesa);

      socket.emit('getTara', {
        tara: (pesaData[idPesa]?.pesoTara ?? 0).toString()
      });
    });

    socket.on("tareWeight", (data) => {
      const { idPesa, pesoTara } = data;
      if (!idPesa) return;

      pesaData[idPesa] = pesaData[idPesa] || {};
      pesaData[idPesa].pesoTara = parseFloat(pesoTara);

      console.log(`Peso Tara actualizado para ${idPesa}: ${pesoTara}`);
    });

    socket.on("updatePxP", (data) => {
      const { idPesa, PxP } = data;
      if (!idPesa) return;

      pesaData[idPesa] = pesaData[idPesa] || {};
      pesaData[idPesa].PxP = parseFloat(PxP) || 0;

      console.log(`PxP actualizado para ${idPesa}: ${PxP}`);
    });

    socket.on('disconnect', () => {
      console.log('❌ Cliente frontend desconectado');
    });
  });

  const processReceivedData = (data) => {
    try {

      // Verificar que los datos no estén vacíos
      if (!data || typeof data !== "object") {
        throw new Error("Datos recibidos no válidos.");
      }

      const { idPesa, peso } = data;
      if (!idPesa) throw new Error("idPesa no proporcionado");

      const pesoBruto = parseFloat(peso);
      if (isNaN(pesoBruto)) throw new Error("Peso bruto no válido");

      // Verificar que el peso bruto esté dentro del rango esperado
      if (pesoBruto >= 0 && pesoBruto <= 15) {
        const tara = pesaData[idPesa]?.pesoTara || 0;
        const PxP = pesaData[idPesa]?.PxP || 0;

        const pesoNeto = pesoBruto - tara; // Calcular peso neto

        console.log(`Peso bruto: ${pesoBruto}, Tara: ${tara}, Neto: ${pesoNeto}, PxP: ${PxP}`);

        io.to(idPesa).emit('weightData', {
          Brut: pesoBruto.toString(),
          pesoNeto: pesoNeto.toString(),
        });
      } else {
        console.warn("Peso fuera de rango, ignorando.");
      }
    } catch (ex) {
      console.error("Error procesando los datos:", ex);
    }
  };
};

import { WebSocketServer } from 'ws';

export const serialController = (io, httpServer) => {
  const wsServer = new WebSocketServer({ noServer: true }); // Puerto del WebSocket para Python

  let pesoTara = 0;
  let PxP = 0;

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
    });

    socket.on("tareWeight", (data) => {
      pesoTara = parseFloat(data.pesoTara);
      console.log(`Peso Tara recibido: ${pesoTara}`);
    });

    socket.on("updatePxP", (data) => {
      PxP = parseFloat(data.PxP) || 0; // Si no se recibe PxP, se usa 0
      console.log(`Peso por Pieza (PxP) actualizado: ${PxP}`);
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

      if (!idPesa) throw new Error("Nombre de pesa vacío.");

      const pesoBruto = parseFloat(peso); // Convertir a número

      console.log(`Peso bruto recibido: ${pesoBruto}`); // Depuración: Verificar el valor

      // Verificar que el valor de peso bruto sea un número válido
      if (isNaN(pesoBruto)) {
        throw new Error("Peso bruto no es un número válido.");
      }

      // Verificar que el peso bruto esté dentro del rango esperado
      if (pesoBruto >= 0 && pesoBruto <= 15) {
        const pesoNeto = pesoBruto - pesoTara; // Calcular peso neto
        console.log(`Peso Neto: ${pesoNeto}`);

        io.to(idPesa).emit('weightData', {
          Brut: pesoBruto.toString(),
          pesoNeto: pesoNeto.toString(),
        });
      } else {
        console.warn("Valor fuera del rango esperado, ignorando.");
      }
    } catch (ex) {
      console.error("Error procesando los datos recibidos:", ex);
    }
  };
};

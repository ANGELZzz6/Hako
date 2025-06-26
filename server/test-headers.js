const express = require('express');
const cors = require('cors');

const app = express();

// Headers específicos para Google OAuth
app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.setHeader('Cross-Origin-Embedder-Policy', 'unsafe-none');
  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
});

app.use(cors({
  origin: ['http://localhost:5173'],
  credentials: true
}));

app.get('/test-headers', (req, res) => {
  res.json({
    message: 'Headers de prueba',
    headers: {
      'Cross-Origin-Opener-Policy': res.getHeader('Cross-Origin-Opener-Policy'),
      'Cross-Origin-Embedder-Policy': res.getHeader('Cross-Origin-Embedder-Policy'),
      'Cross-Origin-Resource-Policy': res.getHeader('Cross-Origin-Resource-Policy')
    }
  });
});

app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Test Headers</title>
      </head>
      <body>
        <h1>Test de Headers para Google OAuth</h1>
        <p>Verifica la consola del navegador para ver los headers</p>
        <script>
          fetch('/test-headers')
            .then(response => response.json())
            .then(data => {
              console.log('Headers del servidor:', data.headers);
            });
        </script>
      </body>
    </html>
  `);
});

const PORT = 5001;
app.listen(PORT, () => {
  console.log(`🧪 Servidor de prueba en puerto ${PORT}`);
  console.log(`📋 Visita http://localhost:${PORT} para verificar headers`);
}); 
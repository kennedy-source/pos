import http, { IncomingMessage, ServerResponse } from 'http';

const PORT = 4000;

const server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end();
    return;
  }

  if (req.url === '/api/v1/auth/login' && req.method === 'POST') {
    let body = '';

    req.on('data', (chunk: Buffer) => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const { email, password } = JSON.parse(body);

        if (email && password) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({
            success: true,
            data: {
              user: {
                id: '1',
                name: 'Admin User',
                email,
                role: 'ADMIN',
                isActive: true,
              },
              accessToken: 'fake-token-' + Math.random(),
              refreshToken: 'fake-refresh-' + Math.random(),
            }
          }));
        } else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Missing credentials' }));
        }
      } catch {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid JSON' }));
      }
    });

    return;
  }

  if (req.url === '/api/v1/health' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { status: 'ok' } }));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ success: false, message: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`✅ API running on http://localhost:${PORT}`);
});
import http from 'node:http';
import net from 'node:net';

const frontend = { host: '127.0.0.1', port: 8081 };
const backend = { host: '127.0.0.1', port: 3000 };
const port = 4000;

const targetFor = (url = '') =>
  url.startsWith('/api/') || url.startsWith('/cable') ? backend : frontend;

const server = http.createServer((request, response) => {
  const target = targetFor(request.url);
  const upstream = http.request(
    {
      host: target.host,
      port: target.port,
      method: request.method,
      path: request.url,
      headers: { ...request.headers, host: `${target.host}:${target.port}` },
    },
    (upstreamResponse) => {
      response.writeHead(upstreamResponse.statusCode ?? 502, upstreamResponse.headers);
      upstreamResponse.pipe(response);
    }
  );
  upstream.on('error', () => response.writeHead(502).end('Proxy target is unavailable.'));
  request.pipe(upstream);
});

server.on('upgrade', (request, socket, head) => {
  const target = targetFor(request.url);
  const upstream = net.connect(target.port, target.host, () => {
    const headers = Object.entries({ ...request.headers, host: `${target.host}:${target.port}` })
      .map(([name, value]) => `${name}: ${value}`)
      .join('\r\n');
    upstream.write(`${request.method} ${request.url} HTTP/${request.httpVersion}\r\n${headers}\r\n\r\n`);
    upstream.write(head);
    socket.pipe(upstream).pipe(socket);
  });
  upstream.on('error', () => socket.destroy());
});

server.listen(port, () => console.log(`Development proxy listening on http://localhost:${port}`));

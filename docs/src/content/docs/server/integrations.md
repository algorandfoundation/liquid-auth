---
title: "Server: Integrations"
sidebar:
  order: 3
  label: 'Integrations'
next: false
---

### NGINX

The official Docker image supports environment variable substitution in the template folder. To integrate NGINX with your Liquid Auth API:

1. Add your distribution files to the container under `/usr/share/nginx/html`.
2. Set the `LIQUID_API_HOST` environment variable to point to your deployed Liquid Auth API.

Here’s a sample NGINX configuration:

```nginx
# /etc/nginx/template/default.conf.template

server {
    listen            80;
    listen       [::]:80;
    server_name  localhost;
    
    root   /usr/share/nginx/html;

    location / {
        index  index.html index.htm;
        expires -1;
        try_files $uri $uri/ @fallback;
    }

    location @fallback  {
        proxy_set_header Host ${LIQUID_API_HOST};
        proxy_set_header X-Real-IP $remote_addr;
        proxy_ssl_server_name on;
        proxy_pass https://${LIQUID_API_HOST};
    }
}

```

### Vite
> For local development, Vite can run without a proxy. However, we recommend using a proxy server like NGINX in production.

Below is an example configuration for Vite:

```typescript
// vite.config.ts

const DEFAULT_PROXY_URL = 'http://localhost:3000';
const DEFAULT_WSS_PROXY_URL = 'ws://localhost:3000';
export default defineConfig({
  server: {
    proxy: {
      '^/auth/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
      '^/.well-known/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
      '^/attestation/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
      '^/assertion/.*': process.env.PROXY_URL || DEFAULT_PROXY_URL,
      '/socket.io': {
        target: process.env.WSS_PROXY_SERVER || DEFAULT_WSS_PROXY_URL,
        ws: true,
      },
    }
  },
})
```

### Next.js
> We also recommend running a proxy server like Nginx in production. This will work in a pinch or to test locally.

Deploy the service to a platform like Render or AWS then configure the Proxy in `next.config.js`.

```typescript
// next.config.js
/** @type {import('next').NextConfig} */

const serverURL = "https://my-liquid-service.com";

const nextConfig = {
  trailingSlash: true,
  async rewrites() {
    return [
      {
        source: '/auth/:path*',
        destination: `${serverURL}/auth/:path*`,
      },
      {
        source: '/.well-known/:path*',
        destination: `${serverURL}/.well-known/:path*`,
      },
      {
        source: '/attestation/:path*',
        destination: `${serverURL}/attestation/:path*`,
      },

      {
        source: '/assertion/:path*',
        destination: `${serverURL}/assertion/:path*`,
      },
      {
        source: '/socket.io/',
        destination: `${serverURL}/socket.io/`,
      },
      {
        source: '/socket.io',
        destination: `${serverURL}/socket.io/`,
      },
    ]
  },
};

export default nextConfig;
```

### Nest.js[WIP]
> Warning: The service package is not publicly available.
> Please contact us if you are interested in integrating the server.

Refer to the [Demo Express](https://github.com/algorandfoundation/liquid-auth/blob/develop/sites/express-dapp/src/main.ts) app for an example of how to mount the server.

To install the Liquid server package:

```shell
npm install @algorandfoundation/liquid-server --save
```

```typescript
// src/main.ts
import { AppModule, RedisIoAdapter } from '@algorandfoundation/liquid-server';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new RedisIoAdapter(app));
  await app.listen(3000);
}
```

### Vercel
> For deploying on Vercel, you can configure the proxy as shown below. We recommend using a proxy server like NGINX in production for optimal performance.

```json
// vercel.json
{
  "rewrites": [
    {
      "source": "/auth/:path*",
      "destination": "${serverURL}/auth/:path*"
    },
    {
      "source": "/.well-known/:path*",
      "destination": "${serverURL}/.well-known/:path*"
    },
    {
      "source": "/attestation/:path*",
      "destination": "/attestation/:path*"
    },

    {
      "source": "/assertion/:path*",
      "destination": "${serverURL}/assertion/:path*"
    },
    {
      "source": "/socket.io/",
      "destination": "${serverURL}/socket.io/"
    },
    {
      "source": "/socket.io",
      "destination": "${serverURL}/socket.io/"
    }
  ]
}
```


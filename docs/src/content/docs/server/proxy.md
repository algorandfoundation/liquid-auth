---
title: Proxy Configurations
---

Example configurations for running the service behind a proxy.

### Vite
```typescript
//vite.config.ts
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
### Vercel

```json
//vercel.json
{
  "todo": "Add Vercel proxy configuration"
}
```

### NGINX
```nginx
//default.conf
#todo Add Nginx proxy configuration
```

## Reverse Proxy

Pass the `PROXY_URL` environment variable to the service to run it as a reverse proxy.

```bash
docker run -d -p 3000:3000 -e PROXY_URL=http://example.com liquid-auth
```

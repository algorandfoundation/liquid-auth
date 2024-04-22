---
title: Getting Started
---

Liquid Auth is a self-hosted authentication service that provides a simple way to associate Passkeys to KeyPair(s) commonly found in cryptocurrencies.

## Running Locally

The Android authenticator requires a secure connection, make sure to run the service behind a valid certificate.

### SSL using [ngrok]()
```bash
ngrok http 3000
```


### Running the Service

To run Liquid Auth locally, you can use the following command:

```
#run.sh
docker run -d -p 3000:3000 --env-file .docker.env liquid-auth:latest
```

#### Environment Variables
```env
#.docker.env

# FIDO2
RP_NAME=<SERVICE_NAME> # e.g. Liquid dApp
HOSTNAME=<HOSTNAME> # e.g. my-liquid-auth-service.com or <ngrok-id>.ngrok.io
ORIGIN=<ORIGIN> # e.g. https://my-liquid-auth-service.com or https://<ngrok-id>.ngrok.io

# Database
DB_HOST=<HOST>
DB_USERNAME=<USER>
DB_PASSWORD=<PASSWORD>
DB_NAME=<NAME>
DB_ATLAS=<true | false>

# Events
REDIS_HOST=<HOST>
REDIS_PORT=<PORT>
REDIS_USERNAME=<USER>
REDIS_PASSWORD=<PASSWORD>
```

See more details about deployments in the [Server](/server/introduction) guide.

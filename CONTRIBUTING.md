# Overview

This is a guide on how to get the project running and how to contribute


## Getting started

### Prerequisites
- Node.js 20
- Docker

#### Clone the project

```bash
git clone git@github.com:algorandfoundation/liquid-auth.git && cd liquid-auth
```

#### Install package dependencies

```bash
npm install
```

#### Start services

```bash
docker-compose up -d
```

WebAuthn requires a secure context (HTTPS) to work and this will not allow you to test the FIDO2 feature in your local machine.

### NGROK

Sign up for a free account at [ngrok](https://ngrok.com/) and install the ngrok package.
Configure a Static Domain for your ngrok account and update the [.env](services/liquid-auth-api-js/README.md) file with the following keys with the values from ngrok:

```bash
HOSTNAME=example-static-domain.ngrok-free.app
ORIGIN=https://example-static-domain.ngrok-free.app
```

#### Run the ngrok proxy

```bash
ngrok http --domain=example-static-domain.ngrok-free.app 3000
```

#### Run the Authentication Service 
```bash
npm run dev
```

Navigate to the ngrok URL in your browser to test the FIDO2 feature.


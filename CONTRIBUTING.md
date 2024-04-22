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

#### Build Dependencies

```bash
npm run build
```

WebAuthn requires a secure context (HTTPS) to work and this will not allow you to test the FIDO2 feature in your local machine.

### NGROK

Sign up for a free account at [ngrok](https://ngrok.com/) and install the ngrok package.
Configure a Static Domain for your ngrok account and update the [.env](services/liquid-auth-api-js/README.md) file with the following keys with the values from ngrok:


#### Configure NGROK

```bash
cp ./ngrok.template.yml ngrok.yml
```

Make sure to update the `authtoken` and `domain` in the `ngrok.yml` file with your ngrok details.

```yaml
version: 2
authtoken: <NGROK_AUTH_TOKEN>
tunnels:
  website:
    addr: 5173
    proto: http
    domain: <STATIC_DOMAIN>

```

#### Update the Service's .docker.env file

```bash
HOSTNAME=example-static-domain.ngrok-free.app
ORIGIN=https://example-static-domain.ngrok-free.app
```

#### Start services

Run the following command to start the backend:

```bash
docker-compose up -d
```

Navigate to the ngrok URL in your browser to test the FIDO2 feature.


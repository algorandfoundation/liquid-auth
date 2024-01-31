# Algorand Authentication Service

- [Vision](VISION.md)
- [Architecture Diagram](ARCHITECTURE.md)
- [Sequence Diagram](SEQUENCE.md)
- [Decisions](decisions/README.md)

## Installation

```bash
npm install
```

## Develop

Start mongodb and redis server using docker-compose

```bash
docker-compose up -d
```


WebAuthn requires a secure context (HTTPS) to work and this will not allow you to test the FIDO2 feature in your local machine.

### NGROK

Copy the default env configuration template
```bash
cp ./packages/aviceinna-api/.env.example ./packages/aviceinna-api/.env
```

Sign up for a free account at [ngrok](https://ngrok.com/) and install the ngrok package.
Configure a Static Domain for your ngrok account and update the .env file with the following keys with the values from ngrok:

```bash
HOSTNAME=example-static-domain.ngrok-free.app
ORIGIN=https://example-static-domain.ngrok-free.app
```

Run the ngrok proxy to forward the local development server to the internet.

```bash
ngrok http --domain=example-static-domain.ngrok-free.app 3000
```

Run the Authentication Service then navigate to the ngrok URL in your browser to test the FIDO2 feature.

```bash
npm run dev
```



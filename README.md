# Algorand Authentication Service

- [Vision](VISION.md)
- [Architecture Diagram](ARCHITECTURE.md)
- [Sequence Diagram](SEQUENCE.md)
- [Decisions](.decisions/README.md)

# Overview

This project holds the standard FIDO2 api endpoints and the Proof of Knowledge for Algorand specific private keys.
The api is a stateful session-based architecture with endpoint guards.
A user must prove ownership of a private key to associate PublicKeyCredentials

## Getting started

### Prerequisites
- Node.js 18+
- Docker

#### Clone the project

```bash
git clone git@github.com:algorandfoundation/liquid-auth.git && cd liquid-auth
```

### NGROK

**note on VPNs**: Ngrok will not work with VPNs, so to run locally the project, `disable` it or `configure` your VPN's split tunneling to allow ngrok traffic.

Sign up for a free account at [ngrok](https://ngrok.com/) and follow the instructions to get your <NGROK_AUTH_TOKEN> and <NGROK_STATIC_DOMAIN>.

#### With Docker
Don't run the ngrok commands directly as expressed in the ngrok guide as it will create run-time port conflicts.

#### Without Docker
ngrok will ask you to add your auth token to your configuration file.

``` bash
ngrok config add-authtoken <NGROK_AUTH_TOKEN>
```

Will then ask you to deploy your static domain, make sure to change the port to **3000** like this:

``` bash
ngrok http --domain=<NGROK_STATIC_DOMAIN> 3000
```

#### Configure NGROK

Add a `ngrok.yml` configuration to the root directory.

##### Example Configuration
```yaml
version: 2
authtoken: <NGROK_AUTH_TOKEN>
tunnels:
  website:
    addr: liquid-auth:3000
    proto: http
    domain: <NGROK_STATIC_DOMAIN>

```
*Make sure to update the `authtoken` and `domain` in the `ngrok.yml` file with your ngrok details.*

#### Update the Service's .env.docker file

Update the [.env.docker](.env.docker) file with the following keys with the values from ngrok:

```bash
HOSTNAME=<NGROK_STATIC_DOMAIN>
ORIGIN=https://<NGROK_STATIC_DOMAIN>
```

### Start services

Run the following command to start the backend:

```bash
docker-compose up -d
```

### Documentation

A quick way to test the service is using the Astro documentation site. 
To run the documentation, navigate to the `docs` directory:

```bash
cd docs
```

Copy the `.env.template` file to `.env`:

```bash
cp .env.template .env
```

Update the `.env` file with the <NGROK_STATIC_DOMAIN>

```bash
LIQUID_ORIGIN=<NGROK_STATIC_DOMAIN>
```

Install the dependencies:

```bash
npm install
```

Run the documentation:

```bash
npm run dev
```

Navigate to [https://localhost:4321](https://localhost:4321/#get-connected) to view the documentation.

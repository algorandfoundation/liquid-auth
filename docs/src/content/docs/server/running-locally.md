---
title: 'Server: Running Locally'
sidebar:
  order: 1
  label: "Running Locally" 
---

The Liquid Auth service is distributed as a Docker image. Since both FIDO2 and WebRTC protocols require a secure connection, we recommend using [ngrok](#ngrok) to create a secure tunnel to your local server. For integrating Liquid Auth into your web application, see the [Integrations Guide](./integrations) for detailed examples.

### Prerequisites

Before starting, ensure the following are set up:

1. Install Docker on your system.
2. Login with the [GitHub Container Registry](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry#authenticating-with-a-personal-access-token-classic) to access the Liquid Auth Docker image. 

Use the steps below to authenticate with a personal access token:

```bash
export CR_PAT=<YOUR_TOKEN>
echo $CR_PAT | docker login ghcr.io -u <USERNAME> --password-stdin
```

## Docker Image

Liquid Auth is designed to run in a Docker container. You will also need a [MongoDB](https://www.mongodb.com/docs/v4.4/mongo/) and [Redis](https://redis.io/learn/howtos/quick-start) instance to be running for the service to function properly. For configuring the service, refer to the [Environment Variables](../environment-variables) section to create a `.env.docker` file.

Run the service with the following command:

```bash 
docker run -d --env-file .env.docker -p 3000:3000 ghcr.io/algorandfoundation/liquid-auth:develop
```

### Compose Example

Here's an example docker-compose.yml file that sets up Liquid Auth along with MongoDB and Redis:

```yaml
# docker-compose.yml
services:
  liquid-auth:
    image: ghcr.io/algorandfoundation/liquid-auth:develop
    env_file:
      - .env.docker
    ports:
      - "3000:3000"
    depends_on:
      - redis
      - mongo
  redis:
    image: redis
    ports:
      - "6379:6379"
  mongo:
    image: mongo:7.0
    environment:
      - MONGO_INITDB_DATABASE=${DB_NAME:-fido}
      - MONGO_INITDB_ROOT_USERNAME=${DB_USERNAME:-algorand}
      - MONGO_INITDB_ROOT_PASSWORD=${DB_PASSWORD:-algorand}
    ports:
      - "27017:27017"
    volumes:
      - mongo:/data/db
volumes:
  mongo:
```

This setup allows you to run Liquid Auth along with its necessary dependencies in one simple command using Docker Compose.

### Building the Docker Image Locally

If you prefer to build the Docker image locally from the source, follow these steps:

```bash
git clone git@github.com:algorandfoundation/liquid-auth.git && cd liquid-auth
docker build -t my-amazing-liquid-auth:latest .
```

## Setting up NGROK

To enable secure tunneling for local development, you can use ngrok. Here's how to set it up:

1. Sign up for a free account at [ngrok](https://ngrok.com/)
2. Retrieve your <NGROK_AUTH_TOKEN> and <NGROK_STATIC_DOMAIN> from the ngrok dashboard

#### Configuration

ngrok will ask you to add your auth token to your configuration file.

``` bash
ngrok config add-authtoken <NGROK_AUTH_TOKEN>
```

It will then ask you to deploy your static domain, make sure to change the port to **3000** like this:

``` bash
ngrok http --domain=<NGROK_STATIC_DOMAIN> 3000
```

Ensure the service's `ORIGIN` and `HOSTNAME` [environment variables](../environment-variables) are configured correctly with the ngrok domain.

By following these steps, you can securely run Liquid Auth locally for development purposes.
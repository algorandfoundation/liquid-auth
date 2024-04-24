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
- Node.js 20
- Docker

#### Clone the project

```bash
git clone git@github.com:algorandfoundation/liquid-auth.git && cd liquid-auth
```

#### Install package dependencies

WebAuthn requires a secure context (HTTPS) to work and this will not allow you to test the FIDO2 feature in your local machine.

### NGROK

Sign up for a free account at [ngrok](https://ngrok.com/) and install the ngrok package.
Configure a Static Domain for your ngrok account and update the [.env](services/liquid-auth-api-js/README.md) file with the following keys with the values from ngrok:


#### Configure NGROK

Add a `ngrok.yml` configuration to the root directory.

##### Example Configuration
```yaml
version: 2
authtoken: <NGROK_AUTH_TOKEN>
tunnels:
  website:
    addr: liquid-demo:5173
    proto: http
    domain: <NGROK_STATIC_DOMAIN>

```
*Make sure to update the `authtoken` and `domain` in the `ngrok.yml` file with your ngrok details.*

#### Update the Service's .docker.env file

```bash
HOSTNAME=<NGROK_STATIC_DOMAIN>
ORIGIN=https://<NGROK_STATIC_DOMAIN>
```

### Start services

Run the following command to start the backend:

```bash
docker-compose up -d
```

Navigate to the ngrok URL in your browser to test the FIDO2 feature.


## Using the app

#### Install the [Android client](https://github.com/awesome-algorand/android-authentication-client) to your device.

![Step-1.png](.docs%2FStep-1.png)

#### Open the Connect Modal and scan the QR code using the "Connect" button on the Android device

![Step-1-QRCode.png](.docs%2FStep-1-QRCode.png)

#### Register a credential on the Android device

![Step-2.png](.docs%2FStep-2.png)

#### If registration is successful, you can test the credential in the browser

![Step-3.png](.docs%2FStep-3.png)

# Requirements [WIP]

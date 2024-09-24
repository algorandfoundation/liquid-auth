# Algorand Authentication Service 

## Table of Contents
- [Overview](#overview)
- [Quick Links](#quick-links)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Clone the Project](#clone-the-project)
  - [NGROK](#ngrok)
    - [With Docker](#with-docker)
    - [Without Docker](#without-docker)
    - [Configure NGROK](#configure-ngrok)
    - [Update the Service's .env.docker File](#update-the-services-envdocker-file)
  - [Start Services](#start-services)
- [Using the App](#using-the-app)
  - [Install the Android Client](#1-install-the-android-client)
  - [QR Connect](#2-qr-connect)
  - [Peer to Peer](#3-peer-to-peer)

## 📖 Overview

This project implements standard FIDO2 API endpoints and the Proof of Knowledge for Algorand-specific private keys. 
The API follows a stateful, session-based architecture with endpoint guards. A user must authenticate by proving ownership of their private key, which links it to a PublicKeyCredential, enabling secure authentication.

## 🔗 Quick Links
- [Vision](VISION.md)
- [Architecture Diagram](ARCHITECTURE.md)
- [Sequence Diagram](SEQUENCE.md)
- [Decisions](.decisions/README.md)
- [Documentation](https://liquidauth.com/introduction/)

## 🚀 Getting Started

### 📋 Prerequisites
- Node.js 18+
- Docker

#### 🛠️ Clone the Project

```bash
git clone git@github.com:algorandfoundation/liquid-auth.git && cd liquid-auth
```

### 🌐 NGROK

> **Note on VPNs**:  
> ngrok will not work with VPNs. 
> To run the project locally, you have two options: either **disable** your VPN entirely or **configure** your VPN's split tunneling settings to allow ngrok traffic. This will ensure that ngrok can function properly without interference from the VPN.

To get started with ngrok, **sign up for a free account at the [ngrok official website](https://ngrok.com/)**. Once registered, follow the on-screen instructions to obtain your **<NGROK_AUTH_TOKEN>** and **<NGROK_STATIC_DOMAIN>** keys.

#### With Docker
Don't run the ngrok commands directly as expressed in the ngrok guide, as it will create run-time port conflicts.

#### Without Docker
Ngrok will ask you to add your auth token to your configuration file.

```bash
ngrok config add-authtoken <NGROK_AUTH_TOKEN>
```

It will then ask you to deploy your static domain; make sure to change the port to **5173** like this:

```bash
ngrok http --domain=<NGROK_STATIC_DOMAIN> 5173
```

> **Note**: You will need the ngrok URL generated from this command later for testing the FIDO2 feature.

#### Configure NGROK

Add a `ngrok.yml` configuration to the root directory. The following snippet is an example configuration.

```yaml
version: 2
authtoken: <NGROK_AUTH_TOKEN>
tunnels:
  website:
    addr: liquid-auth:5173
    proto: http
    domain: <NGROK_STATIC_DOMAIN>

```
*Make sure to update the `authtoken` and `domain` in the `ngrok.yml` file with your ngrok details.*

#### Update the Service's .env.docker File 

Update the [.env.docker](.env.docker) file in the root directory by adding the following keys and their corresponding values obtained from ngrok:

```bash
HOSTNAME=<NGROK_STATIC_DOMAIN>
ORIGIN=https://<NGROK_STATIC_DOMAIN>
```

### 🔄 Start Services

Run the following command to start the backend:

```bash
docker-compose up -d
```

Navigate to the ngrok URL displayed in your terminal after starting ngrok to test the FIDO2 feature.


## 📱 Using the App 

### 1. Install the [Android Client](https://github.com/algorandfoundation/liquid-auth-android/releases) on Your Device.

![Step-1.png](.docs%2FStep-1.png)

### 2. QR Connect

Open the Connect Modal on the website and scan the QR code using the "Connect" button on the Android device. Follow the instructions on the Android device to register a credential.

![Step-1-QRCode.png](.docs%2FStep-1-QRCode.png)

### 3. Peer to Peer

Once the credential is registered, you can send messages over the peer connection.

![Step-2.png](.docs%2FStep-2.png)

# Algorand Authentication Service

- [Vision](VISION.md)
- [Architecture Diagram](ARCHITECTURE.md)
- [Sequence Diagram](SEQUENCE.md)
- [Decisions](.decisions/README.md)

# Overview

This project holds the standard FIDO2 api endpoints and the Proof of Knowledge for Algorand specific private keys. 
The api is a stateful session-based architecture with endpoint guards. 
A user must prove ownership of a private key to associate PublicKeyCredentials

## Using the app

#### Install the [Android client]() to your device and navigate to https://nest-fido2.onrender.com/.

![Step-1.png](.docs%2FStep-1.png)

#### Open the Connect Modal and scan the QR code using the "Connect" button on the Android device

![Step-1-QRCode.png](.docs%2FStep-1-QRCode.png)

#### Register a credential on the Android device

![Step-2.png](.docs%2FStep-2.png)

#### If registration is successful, you can test the credential in the browser

![Step-3.png](.docs%2FStep-3.png)

# Requirements [WIP]

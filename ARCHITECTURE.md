## Overview

### Components
- Nest.js (Microservices/REST API)
- Redis (Events/WebSockets)
- MongoDB (SessionStore/Users)

This service uses [FIDO2 REST API]() endpoints for credential creation and assertions.
The endpoints are guarded by the attestation of a wallet private key via the [Link Wallet]() component.

## Link Wallet

Sessions use the `wallet` key in order to determine if a session has been validated by
a wallet's private key. The wallet is assigned to the session in a POST request.

### POST /connect/response

The response will be successful if the challenge and signature are valid. Any session that matches the `nonce` will
also be assigned a session with the current wallet

### BODY
```json
{
  "requestId": "nonce-one-time-password",
  "challenge": "challenge that was signed by the wallet",
  "signature": "base64URL",
  "wallet": "58 character public key"
}
```

The `nonce` message is passed to the wallet application via a QRCode generated in the frontend.
During the creation of the QRCode, a listener is created with the WebSocketGateway which is dispatched when
a wallet attests the private keys using above endpoint.

## FIDO2 Endpoints

Two main components, Assertion and Attestation

### POST /attestation/request

Returns the credential creation options supported by the service. It accepts
the standard PublicKeyCreateOptions as the `body`. The response can be passed 
to an available authenticator which will generate the credentials.

#### BODY

```json
{
    "attestationType": "none",
    "authenticatorSelection": {
        "userVerification": "required",
        "requireResidentKey": false
    }
}
```

#### Example CredentialCreateOptions Response
```json
{
  "challenge": "HaCt-yOSaFTzMZmpK0eOiokLY6C7avkHdtY75GAecTc",
  "rp": {
    "name": "Algorand Foundation FIDO2 Server",
    "id": "nest-fido2.onrender.com"
  },
  "user": {
    "id": "eEEF7nTevHnehr-iKOWbx2wTr0P26QbEPSM0qve6M_Y",
    "name": "IKMUKRWTOEJMMJD4MUAQWWB4C473DEHXLCYHJ4R3RZWZKPNE7E2ZTQ7VD4",
    "displayName": "IKMUKRWTOEJMMJD4MUAQWWB4C473DEHXLCYHJ4R3RZWZKPNE7E2ZTQ7VD4"
  },
  "pubKeyCredParams": [
    {
      "type": "public-key",
      "alg": -7
    },
    {
      "type": "public-key",
      "alg": -257
    }
  ],
  "timeout": 1800000,
  "attestation": "none",
  "excludeCredentials": [
    {
      "id": "ARuNNRDPHpnGGdMbOA-KOdOFqwrnbf_Q23oxDrojFIUrXpQQNl10TRFmXRTNaSKrrIiL1gQZQmY39-GUyQg_iZg",
      "type": "public-key",
      "transports": [
        "internal"
      ]
    },
    {
      "id": "AV8CQ7z_0uiHs90g-787aoZF8sMnkJPzEhLWJhSTc4XIcC0UZp7ShcoluS21iXtptfx7WqJfjjgbz7p2SrgZNfA",
      "type": "public-key",
      "transports": [
        "internal"
      ]
    }
  ],
  "authenticatorSelection": {
    "requireResidentKey": false,
    "userVerification": "preferred"
  }
}
```
### POST /attestation/response

Receives the PublicKeyCredential result from the authenticator and validates the credential signature.
`body` uses base64URL encoding for keys

#### BODY
```json
{
    "id": "TwmjdtNhFCVxpTAbqUZbvGeAaodj0cInom3QPlyA1LU",
    "rawId": "TwmjdtNhFCVxpTAbqUZbvGeAaodj0cInom3QPlyA1LU",
    "type": "public-key",
    "response": {
        "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uY3JlYXRlIiwiY2hhbGxlbmdlIjoiNVQwY0NUNlJMakprUC1aSVpfUy13VWNULXZVckNsWWRBSW51czZaejdJdyIsIm9yaWdpbiI6Imh0dHBzOi8vbmVzdC1maWRvMi5vbnJlbmRlci5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
        "attestationObject": "o2NmbXRkbm9uZWdhdHRTdG10oGhhdXRoRGF0YVikhcBrTEiqRmWq59OhneuIKT6K3ZliRcGUI2GZj4xPbP9FAAAAAQECAwQFBgcIAQIDBAUGBwgAIE8Jo3bTYRQlcaUwG6lGW7xngGqHY9HCJ6Jt0D5cgNS1pQECAyYgASFYINq8z70oqi4659kEBdv9qG8VJlDnp4KKXYXT4bbaYwn4IlggGrRyhJK-gldiM78-59jzbh3G1gMYTbFu7xFHRaOOr6Y"
    }
}
```


### POST /assertion/request/:credId

Request a PublicKeyGetCredentialOptions from the service. This differs slightly from the FIDO2 API conformance in order to limit
allowed credentials.

#### BODY (Optional)
```json
{
  "authenticatorSelection": {
    "userVerification": "required"
  }
}
```

#### Example Response
```json
{
  "challenge": "9uQtuADttJHniY_-5dMjf0g_txLQFtArgz2DGDpHgPY",
  "allowCredentials": [
    {
      "id": "HyumFG8QZz2urG3UlLNkKVJ6lvOhI2C9M_XfrCSuayk",
      "type": "public-key",
      "transports": [
        "internal"
      ]
    }
  ],
  "timeout": 1800000,
  "userVerification": "required",
  "rpId": "nest-fido2.onrender.com"
}
```

### POST /assertion/response

Base64URL encoded response from the authenticator

#### BODY
```json
{
  "id": "HyumFG8QZz2urG3UlLNkKVJ6lvOhI2C9M_XfrCSuayk",
  "type": "public-key",
  "rawId": "HyumFG8QZz2urG3UlLNkKVJ6lvOhI2C9M_XfrCSuayk",
  "response": {
    "clientDataJSON": "eyJ0eXBlIjoid2ViYXV0aG4uZ2V0IiwiY2hhbGxlbmdlIjoiOWRlZmhQN0x6RXlFOGF3Uks1am5hVUg5YTZsX1dNRmwwbTFXUF91R3NZSSIsIm9yaWdpbiI6Imh0dHBzOi8vbmVzdC1maWRvMi5vbnJlbmRlci5jb20iLCJjcm9zc09yaWdpbiI6ZmFsc2V9",
    "authenticatorData": "hcBrTEiqRmWq59OhneuIKT6K3ZliRcGUI2GZj4xPbP8FAAAAAg",
    "signature": "MEUCIBzJDyfa4kJbDEzwmoXCO_Q9RQmsmTGb9x71hsym2wjDAiEAxI0xoMJPzYo_RFfRi2HrZmn-n5bG1xJg0CzDupBeyhs",
    "userHandle": ""
  }
}
```

---
title: Introduction
category: Service
prev: false
---

Built as a **Nest.js** application with a **Socket.io** gateway. 
The service can be run in one of two ways, **Standalone** or **Reverse Proxy**.
In either mode, the service's primary responsibility is registering and authenticating [PublicKeyCredentials]().

## Features

### FIDO2 Liquid Extension

The service can be used to register or authenticate [PublicKeyCredentials]().
The credential can also be bound to a cryptographic keypair outside of the authenticators' control using the
[FIDO2 Liquid Extension]()

During the registration process, the Liquid Extension can be used to check for a valid signature from the authenticator. 
The extension also supports elevating a remote session to the same level of trust as a local session.

Find out more in the service's [registration guide](/guides/registration) and [authentication guide](/guides/authentication).


### WebRTC Signaling Service

Once more than one session is authorized, the service can be used as a signaling service for [WebRTC]() connections.

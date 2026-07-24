---
title: Architecture
sidebar:
  order: 6
prev: false
next: false
---

This is a high level overview of the sequence of events that happens while using Liquid Auth.
See the [Getting Started](../guides/getting-started) section for more detailed information on each step.
Diagrams are generated using [Mermaid](https://mermaid-js.github.io/mermaid/#/).

## Authentication

A user can link their device to a website by scanning a QR code. 
The website will subscribe to a WebSocket channel to receive the link status. 
The wallet will scan the QR code and send a [FIDO2 PublicKeyCredential]() to the server. 
The server will validate the FIDO2 credential and send a response to the wallet and website.

```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Website->>Server: Subscribe to 'wss:link'
    Website-->>Website: Display QR Connect Request ID
    Wallet->>Website: Scan QR Code
    Server-->>Wallet: Get Challenge/Options
    Wallet->>Server: POST FIDO2 Credential + Liquid Auth Extension
    Server-->>Server: Validate Signatures
    Server-->>Website: HTTPOnly Session
    Server->>Wallet: Ok Response + HTTPOnly Session
    Server->>Website: Emit to `wss:link` client
```

## Signaling

The website and wallet can subscribe to an isolated WebSocket channel to broker [Session Description]() answers and offers.
[ICE Candidates]() are discovered when any peer has both an offer and answer.

Signaling is keyed on the `requestId` rather than the wallet address. When a client
subscribes to `wss:link`, and when a wallet authenticates against a `requestId`, the
server joins that socket to the `requestId` room. Descriptions and candidates are then
brokered to that room, so negotiation works before the peer has authenticated and no
longer depends on the wallet address.

```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Website-->>Server: Subscribe to 'wss:offer-description'
    Website-->>Server: Subscribe to 'wss:offer-candidate'
    Wallet-->>Server: Subscribe to 'wss:answer-description'
    Wallet-->>Server: Subscribe to 'wss:answer-candidate'
```

### Offer

[Offers]() are created by a peer and sent through the signaling service. 
A client with an offer will listen for an answer description. 
Answers are only emitted in response to an offer.
Offer clients are responsible for creating the [Data Channel]().

```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Wallet-->>Wallet: On answer-description, set Remote SDP
    Wallet-->>Wallet: On answer-candidate, add ICE Candidate
    Wallet-->>Wallet: Create Peer Offer & DataChannel
    Wallet-->>Server: Emit `wss:offer-description`
    Wallet-->>Server: Emit `wss:offer-candidate`
```

### Answer

An [Answer]() is created by a peer in response to an offer.
The answer description and candidates are emitted to the signaling service.

```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Website-->>Website: On offer-description, set Remote SDP and create Answer
    Website-->>Website: On offer-candidate, add ICE Candidate
    Website-->>Server: Emit `wss:answer-description`
    Website-->>Server: Emit `wss:answer-candidate`
```

### Data Channel

Once an Offer and Answer have been exchanged, a [Data Channel]() will be emitted to the peer who created the answer.
This channel is used to send messages between the website and wallet in real-time over the established P2P connection.
```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Wallet-->>Website: Emit DataChannel
    Wallet-->>Wallet: On Message, Handle Message
    Website-->>Website: On DataChannel, listen for Messages
    Website-->>Wallet: Emit Messages
    Wallet-->>Website: Emit Messages
```

## Presence

Whenever a socket joins or leaves a `requestId` room the server broadcasts a
`wss:presence` event to that room. Peers use it to decide whether the other party is
available before attempting to (re)negotiate, and only negotiate once both peers are
present (`deviceCount >= 2`).

`deviceCount` counts distinct devices — sockets are collapsed by their session id, so a
device that briefly owns more than one socket (e.g. a lingering socket plus a fresh
reconnect) is only counted once. `online` is `true` when at least one device is present.
`GET /auth/session` reports the same live `deviceCount`.

```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Wallet->>Server: Connect / authenticate for `requestId`
    Server-->>Server: Join `requestId` room, count distinct devices
    Server-->>Website: Emit `wss:presence` { requestId, deviceCount, online }
    Server-->>Wallet: Emit `wss:presence` { requestId, deviceCount, online }
    Note over Website, Wallet: Negotiate only when deviceCount ≥ 2
```

## Reconnection

Because both peers persist the `requestId` and the wallet retains a valid session, a
dropped P2P connection is renegotiated over the existing socket without a fresh passkey
prompt. The server re-announces `auth` when a bound wallet reconnects (or when the peer
links while the wallet is already present), and both sides re-run the offer/answer
exchange in the `requestId` room.

```mermaid
sequenceDiagram
    participant Website as Answer Client
    participant Server
    participant Wallet as Offer Client
    Note over Website, Wallet: Previously paired (share requestId + valid session)
    Wallet--xServer: Connection dropped
    Server-->>Website: Emit `wss:presence` { deviceCount: 1, online: true }
    Website-->>Website: Peer offline — tear down transport, keep socket & wait
    Wallet->>Server: Reconnect socket (no passkey prompt)
    Server-->>Server: Re-join `requestId` room, re-announce `auth`
    Server-->>Website: Emit `wss:presence` { deviceCount: 2, online: true }
    Note over Website, Wallet: Both present — renegotiate and re-establish the Data Channel
```

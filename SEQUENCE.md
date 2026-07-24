
## Sequence Diagram

All signaling for a pairing is keyed on the `requestId`. When a client subscribes to
`wss:link` (or a wallet authenticates against a `requestId`) its socket joins the
`requestId` room. Session Descriptions and ICE Candidates are then brokered to that
room, so negotiation no longer depends on the wallet address and works before the
peer has authenticated.

```mermaid
sequenceDiagram
    participant Website
    participant Server
    participant Wallet
    Note over Website, Wallet: Link devices
    Website->>Server: Subscribe to 'wss:link'
    Server-->>Server: Join Website socket to `requestId` room
    Website-->>Website: Display QR Connect Request ID
    Wallet->>Website: Scan QR Code
    Server-->>Wallet: Get Challenge/Options
    Wallet->>Server: POST FIDO2 Credential + Liquid Auth Extension
    Server-->>Server: Validate Signatures
    Server-->>Server: Persist `requestId` on Wallet session, join Wallet socket to `requestId` room
    Server-->>Website: HTTPOnly Session
    Server->>Wallet: Ok Response + HTTPOnly Session
    Server->>Website: Emit `microservice:auth` to resolve `wss:link`

    Note over Website, Wallet: Presence (focused on the requestId)
    Server-->>Website: Broadcast `wss:presence` { requestId, deviceCount, online }
    Server-->>Wallet: Broadcast `wss:presence` { requestId, deviceCount, online }
    Note over Website, Wallet: Peers only negotiate once both are present (deviceCount ≥ 2)

    Note over Website, Wallet: Signaling Channels (requestId room)
    Website-->>Server: Subscribe to 'wss:offer-description'
    Website-->>Server: Subscribe to 'wss:offer-candidate'
    Wallet-->>Server: Subscribe to 'wss:answer-description'
    Wallet-->>Server: Subscribe to 'wss:answer-candidate'

    Note over Website, Wallet: Peer Offer
    Wallet-->>Wallet: On answer-description, set Remote SDP
    Wallet-->>Wallet: On answer-candidate, add ICE Candidate
    Wallet-->>Wallet: Create Peer Offer & DataChannel
    Wallet-->>Server: Emit `wss:offer-description` (to `requestId` room)
    Wallet-->>Server: Emit `wss:offer-candidate` (to `requestId` room)

    Note over Website, Wallet: Peer Answer
    Website-->>Website: On offer-description, set Remote SDP and create Answer
    Website-->>Website: On offer-candidate, add ICE Candidate
    Website-->>Server: Emit `wss:answer-description` (to `requestId` room)
    Website-->>Server: Emit `wss:answer-candidate` (to `requestId` room)

    Note over Website, Wallet: Data Channel
    Website-->>Wallet: On DataChannel, Emit Messages
```

## Presence & Reconnection

Every connection change broadcasts a `wss:presence` event to the `requestId` room so
peers can tell whether the other party is available before attempting to (re)negotiate.
`deviceCount` counts distinct devices (collapsed by session id, so one device that owns
several sockets is only counted once), and `online` is `true` when at least one device
is present. `GET /auth/session` reports the same live `deviceCount`. An offline client
uses this to decide whether it should even attempt to reconnect.

Because both peers persist the `requestId` and the wallet keeps a valid session, a
dropped connection is renegotiated over the existing socket without a fresh passkey
prompt: the server re-announces `auth` when a bound wallet reconnects (or when the peer
links while the wallet is already present), and both sides re-run the offer/answer
exchange in the `requestId` room.

```mermaid
sequenceDiagram
    participant Website
    participant Server
    participant Wallet
    Note over Website, Wallet: Both previously paired (share requestId + valid session)
    Wallet--xServer: Connection dropped
    Server-->>Website: Broadcast `wss:presence` { deviceCount: 1, online: true }
    Website-->>Website: Peer offline — tear down transport, keep socket & wait
    Wallet->>Server: Reconnect socket (session still valid, no passkey prompt)
    Server-->>Server: Re-join Wallet to `requestId` room, re-announce `auth`
    Server-->>Website: Broadcast `wss:presence` { deviceCount: 2, online: true }
    Note over Website, Wallet: Both present — renegotiate over the socket
    Wallet-->>Server: Emit `wss:offer-description` / `wss:offer-candidate`
    Website-->>Server: Emit `wss:answer-description` / `wss:answer-candidate`
    Website-->>Wallet: DataChannel re-established
```

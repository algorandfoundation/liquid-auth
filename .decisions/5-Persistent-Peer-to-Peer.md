# Overview

Allow for persistent connections between peers that can survive disconnections

## Problems:

> [!NOTE]
> We need to exchange a single message between peers, then they can safely disconnect
> A gossip network will introduce complexity to message passing

The liveliness of the network is correlated to its interconnectivity.
As connections increase, the liveliness decreases and eventually halts (ie [Amdahl's Law](https://en.wikipedia.org/wiki/Amdahl%27s_law)).


Client Code Illustration:

```typescript
// Would be managable for only a few services to round-robin
const broker = new Broker(['liquidauth.io', 'algorand.co', 'governance.algorand.foundation'])
// Only requires a single message received and sent to succesfully connect via WebRTC
broker.onMessage(()=>{})
// As the list grows, we would lose livelyness and eventually hit stack size limits
broker.add([...manyOtherServices])
```

## Solutions:

### 1. Current Solution

> [!Note]
> By refactoring slightly, we could achieve a similar result 

TLDR: Sometimes the best solution is no solution! 

Avoids the problem by restricting to direct negotiation at the origin service using QRCodes to pass unique requestIds
This requires a trusted execution environment such as the Browser and Liquid Auth Service to avoid
[phishing attempts](https://danielfett.de/2025/03/10/cross-device-session-fixation/)

If we simply request the passkey from the hybrid transport at the time of signing, we could then safely renegotiate.
To the end user this would be most likely seamless.

#### Pros:

- Origin validation is strongly enforced (origin, requestId and Passkey credential)
- Many standards to leverage (FIDO/WebAuthn/DID)
- Trusted bridge between peers

#### Cons:

- Requires securing of the RequestId to prevent impersonation
- Requires display of the RequestId to initiate connections with peers
- Keepalive and persistence with origin servers are non-trivial
- Requires federation for cross-origin requests (less decentralized)
- Brokering messages is non-trivial and relies on third party

### 2. Larger Refactor (TBD)

> [!NOTE]
> We should consider this as an option to separate the concerns of Authentication and Communication
> This will allow us to adopt Passkeys independently of communication in use cases like HashiCorp-Vault

TLDR: Refactor WebRTC into a stand-alone product, with the above current solution

Produce credential provider services and limit use to caBLE/Hybrid from the browser.
Removes WebRTC communications to become a stand-alone product (See SecretBox, PubSub, Gossip).

#### Pros:

- Origin validation is strongly enforced (origin, requestId and Passkey credential)
- Connections are managed by third parties
- Allows Passkey adoption in services without requiring peer support (hash-vault)
- Allows adoption of WebRTC at a future date

#### Cons:
- Third party trust
- Limited control over the messages

### 3. NaCl SecretBox Approach (TBD):

> [!Note]
> By far the most promising long-term solution, parties can negotiate directly using the Credential API. 
> It could extend the liquid auth and DID work into a cohesive product

TLDR: Have the connection information publicly available, guarded by the identity of the parties

Something many projects have adopted, notabliy Cardano with [CIP-45](https://cips.cardano.org/cip/CIP-45).
Having the peer connection in a SecretBox allows it to be publicly distributed with multiple parties, 
largely solving the need to relay connection messages completely. 
Parties can read from the resolver and decrypt the session information.

This has been used in the past to demonstrate [shared secret storage](https://github.com/jo/pouch-box?tab=readme-ov-file#permit-permitpermit-id).
The CIP-45 approach could be augmented to support DID documents, storing the session information which all nodes could resolve

Pseudo DID (TBD by architect):
```json
{
  "@context": [
    "https://w3id.org/connectivity/suites/webrtc/v1"
  ],
  "id": "did:rtc:<BoxPubKey>",
  "devices": [
    "<PUB_KEY>"
  ]
}
```
Web Authn Extension Example (TBD by architect):
```json
{
  "type": "liquid",
  "peerId": "<BOX_KEY>",
  "identities": ["<BrowserID>", "<ServiceID>"]
}
```

#### Pros:

- Requires a single connection to the dataset (did-resolve, torrent, blockchain, etc)
- Trust-less environment with every party presenting their credentials
- Aligns with Wallet Foundation work and Identity Wallet/DID

#### Cons:

- Requires a high level of resources for designing security model/architecture (all hands on deck)
- Distribution of secret boxes is non-trivial (federation requirements)
- Abuse/maintenance overhead for each resolver

### 4. Pub/Sub Approach (TBD):

> [!NOTE]
> Leveraging trusted technology providers can help mitigate the design requirements.

TLDR: Create our own federated event source

Using traditional systems ([kafka](https://kafka.apache.org/), [ZMQ](https://zeromq.org/),
we can create decentralized|federated networks which allow message passing.

#### Pros:

- Supports many protocols (HTTP, Websockets, etc)
- Enterprise grade software (Kafka, SQS, etc)
- Allows complex interactions and extending of messages
- Large developer networks

#### Cons:

- Minimal overhead in creating requirements
- As the network grows larger, the liveliness decreases. Making the system appear slow or unresponsive at times
- Federation is likely a requirement (Could benefit from a SecretBox strategy)


### 5. Gossip Approach (TBD):

> [!WARNING]
> This is the least viable as of the time of writing. 
> Very little pure/private P2P support with little benefit over the current solution

TLDR: Leverage existing P2P frameworks

Frameworks (ie [Libp2p](https://libp2p.io/), [Iroh](https://www.iroh.computer/)))
provide a relay feature and a gossip protocol which maintains paths to peers
through the network, thereby reducing the connections to the available relay nodes in the network.
 
#### Pros:

- Supports N Number of persistent connections by "redialing" a peer in the network
- Supports Y Number of services supported with features such as dns resolvers
- Allows complex interactions and extending of messages

#### Cons:

- Relaiblity issues compared to enterprise software
- As the network grows larger, the livelness decreases. Making the system appear slow or unresponsive at times
- Brokering is non-trivial and message delivery is not guaranteed


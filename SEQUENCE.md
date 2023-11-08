
## Nonce

```mermaid
sequenceDiagram
    participant Website
    participant Server
    participant Wallet
    Note over Website, Wallet: Link devices
    Website->>Server: Subscribe to 'wss:link'
    Website-->>Website: Show QR Nonce/Challenge
    Wallet->>Website: Scan QR Code
    Wallet->>Server: POST Nonce + Signature
    Server-->>Server: Validate Signature
    Server-->>Server: Create/Get User
    Server-->>Website: HTTPOnly Session
    Server->>Wallet: Ok Response + HTTPOnly Session
    Server->>Website: Emit to `wss:link` client
    Website-->>Website: Continue FIDO2 Flow
    Wallet-->>Wallet: Continue FIDO2 Flow
```

## Authentication
```mermaid
sequenceDiagram
    participant User
    participant Application
    participant Server
    Note over User, Server: Registration
    Application->>Server: Registration Request
    Server->>Server: Get User
    Server-->>Application: Request for Public Key
    Application->>User: Ask for Biometrics/Key
    User-->>Application: Respond with Credentials
    Application->>Application: Create KeyPair
    Application->>Server: Send Public Key
    Server->>Server: Update User
    Server-->>Application: Registration Success
    
    Note over User, Server: Authentication
    Application->>Server: Authentication Request
    Server-->>Server: Get User
    Server-->>Application: Send challenge to sign
    Application->>User: Ask for Biometrics/Key
    User-->>Application: Respond with Credentials
    Application->>Application: Sign Challenge
    Application->>Server: Send Signed Challenge
    Server->>Server: Verify Signature
    Server-->>Application: Authentication Success
    
```

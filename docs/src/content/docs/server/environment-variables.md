---
title: 'Server: Configuration'
sidebar:
  order: 2
  label: 'Configuration'
---

Liquid Auth is configured with environment variables. When using Docker, keep
the deployment-specific values in a protected `.env.docker` file or inject them
from a secret manager. Do not commit real secrets to source control.

## Production secrets

Production startup requires two explicit, independent secrets. Generate each
value separately; for example, run `openssl rand -base64 48` twice and store the
two results in your secret manager.

| Variable                    | Required in production | Purpose                                                                                   |
| --------------------------- | ---------------------- | ----------------------------------------------------------------------------------------- |
| `SESSION_SECRET`            | Yes                    | Signs the Express session cookie.                                                         |
| `PAIRING_CREDENTIAL_SECRET` | Yes                    | Keys the hashes used to authenticate durable provider and controller pairing credentials. |

Each secret must contain at least 32 characters with sufficient character
variety, must not be a placeholder, and the two values must not be equal. The
server refuses to start with an unsafe production configuration. Development
and test environments retain local defaults for convenience.

`PAIRING_CREDENTIAL_SECRET` is durable application data, not a disposable
deployment secret. Every server replica must use exactly the same value. Back it
up alongside the MongoDB data and restore both together. **Do not rotate, delete,
or regenerate this secret after creating pairings.** Existing credential hashes
cannot be checked with a different key, so changing it invalidates every stored
pairing and forces users to pair again. Rotation requires a separately designed
credential migration or key-ring rollout; a routine deploy must keep this value
stable.

Changing `SESSION_SECRET` invalidates current browser sessions. Keep it stable
across replicas and routine deploys as well, but always keep it independent from
`PAIRING_CREDENTIAL_SECRET` so a session-key change cannot silently invalidate
durable pairings.

## Application, sessions, and pairing

| Variable                         | Default                            | Description                                                                                                                  |
| -------------------------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `NODE_ENV`                       | `development`                      | Set to `production` in a deployment; this enables strict secret validation.                                                  |
| `PORT`                           | `3000`                             | HTTP and Socket.IO listening port.                                                                                           |
| `SENTRY_DNS`                     | unset                              | Sentry DSN when error reporting is enabled.                                                                                  |
| `SESSION_SECRET`                 | Local-only default                 | Required production session signing secret described above.                                                                  |
| `SESSION_SECURE`                 | `false`                            | Set to `true` when cookies are served over HTTPS.                                                                            |
| `SESSION_TTL_SECONDS`            | `20000`                            | Session record lifetime in MongoDB, in seconds. This does not expire an approved pairing.                                    |
| `SESSION_COOKIE_MAX_AGE_MS`      | `20000000`                         | Session cookie lifetime in milliseconds. This does not expire an approved pairing.                                           |
| `SESSION_SAME_SITE`              | `lax`                              | Express session cookie `SameSite` value.                                                                                     |
| `TRUST_PROXY`                    | `false`                            | Set to `true` when a trusted reverse proxy terminates HTTPS.                                                                 |
| `CORS_ORIGINS`                   | `ORIGIN`, then `http://localhost`  | Comma-separated browser origins allowed to send credentialed requests.                                                       |
| `PAIRING_CREDENTIAL_SECRET`      | Local-only session-secret fallback | Required independent production key described above.                                                                         |
| `PAIRING_INVITATION_TTL_SECONDS` | `900`                              | Time in seconds that an unapproved pairing invitation can be claimed. It does not limit the lifetime of an approved pairing. |

## WebAuthn and application links

Attestations and assertions require a valid `RP_NAME`, `HOSTNAME`, and `ORIGIN`.
`ORIGIN` and `HOSTNAME` must use a domain secured with HTTPS.

```sh
RP_NAME=<SERVICE_NAME> # Friendly name of the service
HOSTNAME=<DOMAIN_NAME> # Hostname of the service
ORIGIN=https://<DOMAIN_NAME> # Origin of the service
```

If you are using a custom Android client, update its package name and signing
certificate fingerprint.

```bash
ANDROID_SHA256HASH=<00:00:...> # SHA256 fingerprint of the Android client
ANDROID_PACKAGENAME=<com.example.my-wallet> # Package name of the Android client
```

## MongoDB

```bash
DB_HOST=<MONGO_DB_HOST:PORT> # Hostname of the MongoDB instance
DB_USERNAME=<MONGO_DB_USERNAME> # Username for the MongoDB instance
DB_PASSWORD=<MONGO_DB_PASSWORD> # Password for the MongoDB instance
DB_NAME=<MONGO_DB_NAME> # Database name
DB_ATLAS=false # Set to true if using MongoDB Atlas
```

MongoDB stores sessions, active pairings, and revocation tombstones. Use durable
storage and include it in backups.

## Redis

```bash
REDIS_HOST=<REDIS_HOST> # Hostname of the Redis instance
REDIS_PORT=<REDIS_PORT> # Port for the Redis instance
REDIS_USERNAME=<REDIS_USERNAME> # Username for the Redis instance
REDIS_PASSWORD= # Password for the Redis instance
```

Redis distributes signaling and revocation events between replicas. Pairing
authorization remains durable in MongoDB and does not depend on Redis retaining
historical messages.

## Durable reconnect and revocation

An approved pairing is not tied to the browser session or invitation TTL. A
provider or controller can return after either has expired and authenticate with
its saved pairing ID, role, and credential. Temporary HTTP, Socket.IO, Redis, or
database failures are retryable and do not remove a pairing.

Revocation is credential-authenticated and idempotent. Revoked active pairings
remain in MongoDB with `status: revoked`. Revoking an unapproved invitation
removes its TTL field and retains the invitation as a permanent tombstone. These
tombstones prevent a public pairing ID from being recreated or rebound after an
explicit removal. Back up tombstones with the rest of MongoDB and do not apply a
cleanup TTL to revoked records. Restoring a database snapshot from before a
revocation also restores the older pairing state, so retain and restore the
latest revocation records when recovering a deployment.

Signaling clients receive `PAIRING_REVOKED` only for an explicit revocation and
should treat it as terminal. `PAIRING_UNAUTHORIZED` means the supplied durable
credential is invalid; clients must stop retrying that credential and may start
an approved credential-recovery flow. Operational and transport errors have no
terminal pairing code and should be retried without deleting local pairing
state.

## Rollout order

Roll out the durable protocol in dependency order so frozen consumer lockfiles
cannot install an older implementation:

1. Deploy the Liquid Auth server and its stable production secrets. The server
   remains compatible with legacy session clients while adding v2 pairings.
2. Publish the updated `@algorandfoundation/liquid-client` and
   `@algorandfoundation/ac2-sdk` packages.
3. Refresh the OpenClaw plugin and controller-app lockfiles against those exact
   published artifacts, run their integration tests, and only then publish or
   deploy the consumers.

Do not release a consumer whose lockfile still resolves an earlier client or
SDK canary merely because its manifest range accepts the new version; frozen
package-manager installs use the recorded resolution.

## Full example

```bash
# .env.docker

# Application
NODE_ENV=production
PORT=3000
SESSION_SECRET=<FIRST_INDEPENDENT_RANDOM_VALUE>
SESSION_SECURE=true
SESSION_TTL_SECONDS=20000
SESSION_COOKIE_MAX_AGE_MS=20000000
SESSION_SAME_SITE=lax
TRUST_PROXY=true
CORS_ORIGINS=https://my-static-domain.example
PAIRING_CREDENTIAL_SECRET=<SECOND_INDEPENDENT_RANDOM_VALUE>
PAIRING_INVITATION_TTL_SECONDS=900

# Database
DB_HOST=mongo:27017
DB_USERNAME=algorand
DB_PASSWORD=algorand
DB_NAME=fido
DB_ATLAS=false

# Events
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_USERNAME=default
REDIS_PASSWORD=

# FIDO2
RP_NAME="Auth Server"
HOSTNAME=my-static-domain.example
ORIGIN=https://my-static-domain.example

ANDROID_SHA256HASH=47:CC:4E:EE:B9:50:59:A5:8B:E0:19:45:CA:0A:6D:59:16:F9:A9:C2:96:75:F8:F3:64:86:92:46:2B:7D:5D:5C
ANDROID_PACKAGENAME=foundation.algorand.demo
```

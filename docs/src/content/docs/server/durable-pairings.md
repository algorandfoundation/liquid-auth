---
title: 'Server: Durable pairings'
sidebar:
  order: 3
  label: 'Durable pairings'
---

Liquid Auth v2 pairings authorize repeated signaling sessions without keeping
an Express session alive or repeating WebAuthn. The provider and controller
receive different, role-bound bearer credentials. Store them in each platform's
secret store; never put them in a deep link, log, analytics event, or ordinary
browser storage.

## Create an invitation

The provider creates an invitation before displaying its public pairing ID:

```http
POST /pairings/invitations
Content-Type: application/json

{"requestId":"optional-public-id-at-least-16-characters"}
```

If `requestId` is omitted, the server generates an ID. The response contains a
provider credential that must be persisted before the deep link is shown:

```json
{
  "version": 2,
  "pairingId": "public-pairing-id",
  "role": "provider",
  "credential": "provider-bearer-secret",
  "expiresAt": "2026-07-14T12:30:00.000Z"
}
```

Only `pairingId` is public. The invitation expiry limits the initial WebAuthn
approval window; it does not expire an approved pairing.

## Approve from a controller

Pass the public `pairingId` as `requestId` when requesting assertion or
attestation options. The verified response must carry the same Liquid extension
request ID. On success, the normal user response includes the controller's
role-bound credential:

```json
{
  "pairing": {
    "version": 2,
    "pairingId": "public-pairing-id",
    "role": "controller",
    "credential": "controller-bearer-secret"
  }
}
```

A repeated, valid WebAuthn approval for the same wallet recovers from a lost
HTTP response by issuing a fresh controller credential. Replace the previously
stored controller credential with the returned value. The provider credential
does not rotate.

## Reconnect signaling

Both roles send their full credential object as Socket.IO handshake `auth`:

```json
{
  "version": 2,
  "pairingId": "public-pairing-id",
  "role": "controller",
  "credential": "controller-bearer-secret"
}
```

After approval, this remains valid across process restarts, session-cookie
expiry, Socket.IO disconnects, and new WebRTC negotiations. A physical WebRTC
connection is disposable; reconnect it with the stored credential rather than
repeating WebAuthn.

## Read status

Either role can authenticate its own status request:

```http
GET /pairings/public-pairing-id/status
Authorization: Bearer <role-credential>
X-Pairing-Role: provider
```

The status is `pending`, `active`, or `revoked`. A role header never authorizes
the other role's credential.

## Revoke

Explicit removal calls:

```http
DELETE /pairings/public-pairing-id
Authorization: Bearer <role-credential>
X-Pairing-Role: controller
```

Either role can revoke the whole pairing. DELETE is idempotent with the same
credential, including when the first response was lost. Active records and
pending invitations retain permanent revocation tombstones, so the ID cannot be
reused or rebound.

Treat `PAIRING_REVOKED` as terminal and remove the local pairing. Treat
`PAIRING_UNAUTHORIZED` as an invalid/stale supplied credential; a controller may
perform the single approved WebAuthn recovery flow. Database, Redis, proxy,
Socket.IO transport, timeout, and generic server errors are transient and must
not delete durable pairing state.

See [Server configuration](./environment-variables/) for the stable secret,
backup, tombstone, and rollout requirements.

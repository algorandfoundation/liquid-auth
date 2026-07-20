---
title: 'Server: Introduction'
prev: false
sidebar:
  order: 0
  label: 'Introduction'
---

Liquid Auth is a self-hosted authentication service that provides a simple way to associate Passkeys to KeyPair(s) commonly found in cryptocurrencies.

#### Technical Details

It is built using the [NestJS](https://nestjs.com/) framework
and uses [mongoose](https://docs.nestjs.com/techniques/mongodb) to interact with MongoDB.
Signaling is handled using [Socket.IO](https://docs.nestjs.com/websockets/gateways)
backed by a [Redis Adapter](https://socket.io/docs/v4/redis-adapter/).

The service request to be running on the same origin as the dApp.
We recommend configuring your frontend service to proxy requests to the authentication service.

#### Durable pairing lifecycle

Liquid Auth v2 pairings are durable credentials stored in MongoDB. Once an
invitation is approved, the provider and controller can reconnect after session
expiry, process restarts, network outages, or an arbitrarily long absence. The
invitation TTL limits only the initial approval window; it is not a pairing
lease.

The server preserves explicit revocations as tombstones. A revoked active
pairing cannot authenticate again, and a revoked pending invitation cannot be
recreated with the same public ID. `PAIRING_REVOKED` is the terminal signal for
clients to remove a pairing. `PAIRING_UNAUTHORIZED` stops retries with an invalid
credential and may trigger credential recovery. Signaling and infrastructure
failures are retryable and must not remove local pairing state.

This durability depends on retaining MongoDB and keeping
`PAIRING_CREDENTIAL_SECRET` unchanged. See [Server Configuration](./environment-variables/)
for the deployment, backup, and secret requirements.

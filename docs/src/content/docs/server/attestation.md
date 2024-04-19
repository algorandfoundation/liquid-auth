---
title: Attestation
---

## Request

This endpoint is used to fetch the PublicKeyCredentialCreationOptions required to register a new Passkey.
The response includes the challenge, origin, and other parameters required for the registration process.

The request body should include the following parameters:

<!-- todo: add the markdown from swagger -->
- `userVerification` - Verification requirements
- `extensions` - Extensions for the registration process

## Response

This endpoint is used to register a new Passkey using the AuthenticatorAttestationResponse.


The request body should include the following parameters:

<!-- todo: add the markdown from swagger -->
- `id` - The id of the Passkey

## Liquid Auth Extension
It can be extended to include

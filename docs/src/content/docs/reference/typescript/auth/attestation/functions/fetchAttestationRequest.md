---
editUrl: false
next: false
prev: false
title: "fetchAttestationRequest"
---

> **fetchAttestationRequest**(`origin`, `options`): `Promise`\<`Response`\>

Fetch interface for Attestation Options

## Parameters

• **origin**: `string`

• **options**= `DEFAULT_ATTESTATION_OPTIONS`

@todo: Generate Typed JSON-RPC clients from Swagger/OpenAPI

• **options\.attestationType**: `string`= `'none'`

• **options\.authenticatorSelection**= `undefined`

• **options\.authenticatorSelection\.authenticatorAttachment**: `string`= `'platform'`

• **options\.authenticatorSelection\.requireResidentKey**: `boolean`= `false`

• **options\.authenticatorSelection\.userVerification**: `string`= `'required'`

## Returns

`Promise`\<`Response`\>

## Source

[clients/liquid-auth-client-js/src/attestation.ts:73](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/attestation.ts#L73)

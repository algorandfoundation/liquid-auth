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

[clients/liquid-auth-client-js/src/attestation.ts:73](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/attestation.ts#L73)

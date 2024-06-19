---
editUrl: false
next: false
prev: false
title: "attestation"
---

> **attestation**(`origin`, `options`): `Promise`\<`any`\>
Attestation

The process of creating a new credential. It has two parts:

- The server creates a challenge and sends it to the client
- The client creates a credential and sends it to the server

## Parameters

• **origin**: `string`

• **options**= `DEFAULT_ATTESTATION_OPTIONS`

• **options\.attestationType**: `string`= `'none'`

• **options\.authenticatorSelection**= `undefined`

• **options\.authenticatorSelection\.authenticatorAttachment**: `string`= `'platform'`

• **options\.authenticatorSelection\.requireResidentKey**: `boolean`= `false`

• **options\.authenticatorSelection\.userVerification**: `string`= `'required'`

## Returns

`Promise`\<`any`\>

## Source

[clients/liquid-auth-client-js/src/attestation.ts:112](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/attestation.ts#L112)
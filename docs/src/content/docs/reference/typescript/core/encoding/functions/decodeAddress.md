---
editUrl: false
next: false
prev: false
title: "decodeAddress"
---

> **decodeAddress**(`address`): `Uint8Array`

decodeAddress takes an Algorand address in string form and decodes it into a Uint8Array.

## Parameters

• **address**: `string`

an Algorand address with checksum.

## Returns

`Uint8Array`

the decoded form of the address's public key and checksum

## Source

[encoding.ts:86](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-core/src/encoding.ts#L86)

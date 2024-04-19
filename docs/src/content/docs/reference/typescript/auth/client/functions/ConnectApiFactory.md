---
editUrl: false
next: false
prev: false
title: "ConnectApiFactory"
---

> **ConnectApiFactory**(`configuration`?, `fetch`?, `basePath`?): `object`

ConnectApi - factory interface

## Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

• **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)

• **basePath?**: `string`

## Returns

`object`

### connectControllerLinkWalletResponse()

Submit a response from a ConnectQR Scan and login to service

#### Parameters

• **body**: [`LinkResponseDTO`](/reference/typescript/auth/client/interfaces/linkresponsedto/)

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Connect (deprecated)

#### Throws

## Export

## Source

[clients/liquid-auth-client-js/src/client/api.ts:1036](https://github.com/algorandfoundation/liquid-auth/blob/cec82e963bc03c2622fd80036d3c488643177b1a/clients/liquid-auth-client-js/src/client/api.ts#L1036)

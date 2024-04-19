---
editUrl: false
next: false
prev: false
title: "ConnectApi"
---

ConnectApi - object-oriented interface

## Export

ConnectApi

## Extends

- [`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/)

## Constructors

### new ConnectApi(configuration, basePath, fetch)

> **new ConnectApi**(`configuration`?, `basePath`?, `fetch`?): [`ConnectApi`](/reference/typescript/auth/client/classes/connectapi/)

#### Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

• **basePath?**: `string`= `BASE_PATH`

• **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)= `isomorphicFetch`

#### Returns

[`ConnectApi`](/reference/typescript/auth/client/classes/connectapi/)

#### Inherited from

[`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/).[`constructor`](/reference/typescript/auth/client/classes/baseapi/#constructors)

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:59](https://github.com/algorandfoundation/liquid-auth/blob/cec82e963bc03c2622fd80036d3c488643177b1a/clients/liquid-auth-client-js/src/client/api.ts#L59)

## Methods

### connectControllerLinkWalletResponse()

> **connectControllerLinkWalletResponse**(`body`, `options`?): `Promise`\<`Response`\>

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

#### Memberof

ConnectApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:1066](https://github.com/algorandfoundation/liquid-auth/blob/cec82e963bc03c2622fd80036d3c488643177b1a/clients/liquid-auth-client-js/src/client/api.ts#L1066)

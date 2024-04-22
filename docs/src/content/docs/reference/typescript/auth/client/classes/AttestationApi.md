---
editUrl: false
next: false
prev: false
title: "AttestationApi"
---

AttestationApi - object-oriented interface

## Export

AttestationApi

## Extends

- [`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/)

## Constructors

### new AttestationApi(configuration, basePath, fetch)

> **new AttestationApi**(`configuration`?, `basePath`?, `fetch`?): [`AttestationApi`](/reference/typescript/auth/client/classes/attestationapi/)

#### Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

• **basePath?**: `string`= `BASE_PATH`

• **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)= `isomorphicFetch`

#### Returns

[`AttestationApi`](/reference/typescript/auth/client/classes/attestationapi/)

#### Inherited from

[`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/).[`constructor`](/reference/typescript/auth/client/classes/baseapi/#constructors)

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:59](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L59)

## Methods

### attestationControllerAttestationResponse()

> **attestationControllerAttestationResponse**(`options`?): `Promise`\<`Response`\>

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Attestation Response

#### Throws

#### Memberof

AttestationApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:652](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L652)

***

### attestationControllerRequest()

> **attestationControllerRequest**(`options`?): `Promise`\<`Response`\>

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Attestation Request

#### Throws

#### Memberof

AttestationApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:663](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L663)

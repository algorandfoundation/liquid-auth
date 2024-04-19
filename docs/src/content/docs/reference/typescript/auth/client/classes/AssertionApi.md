---
editUrl: false
next: false
prev: false
title: "AssertionApi"
---

AssertionApi - object-oriented interface

## Export

AssertionApi

## Extends

- [`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/)

## Constructors

### new AssertionApi(configuration, basePath, fetch)

> **new AssertionApi**(`configuration`?, `basePath`?, `fetch`?): [`AssertionApi`](/reference/typescript/auth/client/classes/assertionapi/)

#### Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

• **basePath?**: `string`= `BASE_PATH`

• **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)= `isomorphicFetch`

#### Returns

[`AssertionApi`](/reference/typescript/auth/client/classes/assertionapi/)

#### Inherited from

[`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/).[`constructor`](/reference/typescript/auth/client/classes/baseapi/#constructors)

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:59](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L59)

## Methods

### assertionControllerAssertionRequest()

> **assertionControllerAssertionRequest**(`body`, `credId`, `options`?): `Promise`\<[`PublicKeyCredentialRequestOptions`](/reference/typescript/auth/client/interfaces/publickeycredentialrequestoptions/)\>

# POST Assertion Request  This endpoint is used to request assertion options from the FIDO2 service.

#### Parameters

• **body**: [`PublicKeyCredentialRequestOptions`](/reference/typescript/auth/client/interfaces/publickeycredentialrequestoptions/)

• **credId**: `any`

Credential ID

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<[`PublicKeyCredentialRequestOptions`](/reference/typescript/auth/client/interfaces/publickeycredentialrequestoptions/)\>

#### Summary

Assertion Request

#### Throws

#### Memberof

AssertionApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:494](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L494)

***

### assertionControllerAssertionResponse()

> **assertionControllerAssertionResponse**(`body`, `options`?): `Promise`\<[`User`](/reference/typescript/auth/client/interfaces/user/)\>

# POST Assertion Response  This endpoint is used to request assertion options from the FIDO2 service.

#### Parameters

• **body**: [`AssertionCredentialJSON`](/reference/typescript/auth/client/interfaces/assertioncredentialjson/)

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<[`User`](/reference/typescript/auth/client/interfaces/user/)\>

#### Summary

Assertion Response

#### Throws

#### Memberof

AssertionApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:506](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L506)

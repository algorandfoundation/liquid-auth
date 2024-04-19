---
editUrl: false
next: false
prev: false
title: "AssertionApiFetchParamCreator"
---

> **AssertionApiFetchParamCreator**(`configuration`?): `object`

AssertionApi - fetch parameter creator

## Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

## Returns

`object`

### assertionControllerAssertionRequest()

# POST Assertion Request  This endpoint is used to request assertion options from the FIDO2 service.

#### Parameters

• **body**: [`PublicKeyCredentialRequestOptions`](/reference/typescript/auth/client/interfaces/publickeycredentialrequestoptions/)

• **credId**: `any`

Credential ID

• **options?**: `any`= `{}`

Override http request option.

#### Returns

[`FetchArgs`](/reference/typescript/auth/client/interfaces/fetchargs/)

#### Summary

Assertion Request

#### Throws

### assertionControllerAssertionResponse()

# POST Assertion Response  This endpoint is used to request assertion options from the FIDO2 service.

#### Parameters

• **body**: [`AssertionCredentialJSON`](/reference/typescript/auth/client/interfaces/assertioncredentialjson/)

• **options?**: `any`= `{}`

Override http request option.

#### Returns

[`FetchArgs`](/reference/typescript/auth/client/interfaces/fetchargs/)

#### Summary

Assertion Response

#### Throws

## Export

## Source

[clients/liquid-auth-client-js/src/client/api.ts:325](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L325)

---
editUrl: false
next: false
prev: false
title: "AssertionApiFp"
---

> **AssertionApiFp**(`configuration`?): `object`

AssertionApi - functional programming interface

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

• **options?**: `any`

Override http request option.

#### Returns

`Function`

> ##### Parameters
>
> • **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)
>
> • **basePath?**: `string`
>
> ##### Returns
>
> `Promise`\<[`PublicKeyCredentialRequestOptions`](/reference/typescript/auth/client/interfaces/publickeycredentialrequestoptions/)\>
>

#### Summary

Assertion Request

#### Throws

### assertionControllerAssertionResponse()

# POST Assertion Response  This endpoint is used to request assertion options from the FIDO2 service.

#### Parameters

• **body**: [`AssertionCredentialJSON`](/reference/typescript/auth/client/interfaces/assertioncredentialjson/)

• **options?**: `any`

Override http request option.

#### Returns

`Function`

> ##### Parameters
>
> • **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)
>
> • **basePath?**: `string`
>
> ##### Returns
>
> `Promise`\<[`User`](/reference/typescript/auth/client/interfaces/user/)\>
>

#### Summary

Assertion Response

#### Throws

## Export

## Source

[clients/liquid-auth-client-js/src/client/api.ts:404](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L404)

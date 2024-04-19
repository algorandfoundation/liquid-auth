---
editUrl: false
next: false
prev: false
title: "AuthApiFp"
---

> **AuthApiFp**(`configuration`?): `object`

AuthApi - functional programming interface

## Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

## Returns

`object`

### authControllerKeys()

#### Parameters

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

Get User

#### Throws

### authControllerLogout()

#### Parameters

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
> `Promise`\<`Response`\>
>

#### Summary

Log Out

#### Throws

### authControllerRead()

#### Parameters

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
> `Promise`\<`Response`\>
>

#### Summary

Get Session

#### Throws

### authControllerRemove()

#### Parameters

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
> `Promise`\<`Response`\>
>

#### Summary

Delete Credential

#### Throws

## Export

## Source

[clients/liquid-auth-client-js/src/client/api.ts:789](https://github.com/algorandfoundation/liquid-auth/blob/cec82e963bc03c2622fd80036d3c488643177b1a/clients/liquid-auth-client-js/src/client/api.ts#L789)

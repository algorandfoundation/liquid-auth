---
editUrl: false
next: false
prev: false
title: "AuthApiFactory"
---

> **AuthApiFactory**(`configuration`?, `fetch`?, `basePath`?): `object`

AuthApi - factory interface

## Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

• **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)

• **basePath?**: `string`

## Returns

`object`

### authControllerKeys()

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<[`User`](/reference/typescript/auth/client/interfaces/user/)\>

#### Summary

Get User

#### Throws

### authControllerLogout()

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Log Out

#### Throws

### authControllerRead()

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Get Session

#### Throws

### authControllerRemove()

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Delete Credential

#### Throws

## Export

## Source

[clients/liquid-auth-client-js/src/client/api.ts:870](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L870)

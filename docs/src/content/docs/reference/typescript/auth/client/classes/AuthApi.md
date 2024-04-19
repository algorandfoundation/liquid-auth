---
editUrl: false
next: false
prev: false
title: "AuthApi"
---

AuthApi - object-oriented interface

## Export

AuthApi

## Extends

- [`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/)

## Constructors

### new AuthApi(configuration, basePath, fetch)

> **new AuthApi**(`configuration`?, `basePath`?, `fetch`?): [`AuthApi`](/reference/typescript/auth/client/classes/authapi/)

#### Parameters

• **configuration?**: [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

• **basePath?**: `string`= `BASE_PATH`

• **fetch?**: [`FetchAPI`](/reference/typescript/auth/client/interfaces/fetchapi/)= `isomorphicFetch`

#### Returns

[`AuthApi`](/reference/typescript/auth/client/classes/authapi/)

#### Inherited from

[`BaseAPI`](/reference/typescript/auth/client/classes/baseapi/).[`constructor`](/reference/typescript/auth/client/classes/baseapi/#constructors)

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:59](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L59)

## Methods

### authControllerKeys()

> **authControllerKeys**(`options`?): `Promise`\<[`User`](/reference/typescript/auth/client/interfaces/user/)\>

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<[`User`](/reference/typescript/auth/client/interfaces/user/)\>

#### Summary

Get User

#### Throws

#### Memberof

AuthApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:925](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L925)

***

### authControllerLogout()

> **authControllerLogout**(`options`?): `Promise`\<`Response`\>

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Log Out

#### Throws

#### Memberof

AuthApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:936](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L936)

***

### authControllerRead()

> **authControllerRead**(`options`?): `Promise`\<`Response`\>

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Get Session

#### Throws

#### Memberof

AuthApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:947](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L947)

***

### authControllerRemove()

> **authControllerRemove**(`options`?): `Promise`\<`Response`\>

#### Parameters

• **options?**: `any`

Override http request option.

#### Returns

`Promise`\<`Response`\>

#### Summary

Delete Credential

#### Throws

#### Memberof

AuthApi

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:958](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/client/api.ts#L958)

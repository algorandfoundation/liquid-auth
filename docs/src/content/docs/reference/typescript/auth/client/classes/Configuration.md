---
editUrl: false
next: false
prev: false
title: "Configuration"
---

## Constructors

### new Configuration(param)

> **new Configuration**(`param`): [`Configuration`](/reference/typescript/auth/client/classes/configuration/)

#### Parameters

• **param**: [`ConfigurationParameters`](/reference/typescript/auth/client/interfaces/configurationparameters/)= `{}`

#### Returns

[`Configuration`](/reference/typescript/auth/client/classes/configuration/)

#### Source

[clients/liquid-auth-client-js/src/client/configuration.ts:58](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/configuration.ts#L58)

## Properties

### accessToken?

> **`optional`** **accessToken**: `string` \| (`name`, `scopes`?) => `string`

parameter for oauth2 security

#### Param

security name

#### Param

oauth2 scope

#### Memberof

Configuration

#### Source

[clients/liquid-auth-client-js/src/client/configuration.ts:49](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/configuration.ts#L49)

***

### apiKey?

> **`optional`** **apiKey**: `string` \| (`name`) => `string`

parameter for apiKey security

#### Param

security name

#### Memberof

Configuration

#### Source

[clients/liquid-auth-client-js/src/client/configuration.ts:28](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/configuration.ts#L28)

***

### basePath?

> **`optional`** **basePath**: `string`

override base path

#### Memberof

Configuration

#### Source

[clients/liquid-auth-client-js/src/client/configuration.ts:56](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/configuration.ts#L56)

***

### password?

> **`optional`** **password**: `string`

parameter for basic security

#### Memberof

Configuration

#### Source

[clients/liquid-auth-client-js/src/client/configuration.ts:42](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/configuration.ts#L42)

***

### username?

> **`optional`** **username**: `string`

parameter for basic security

#### Memberof

Configuration

#### Source

[clients/liquid-auth-client-js/src/client/configuration.ts:35](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/configuration.ts#L35)

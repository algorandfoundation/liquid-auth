---
editUrl: false
next: false
prev: false
title: "RequiredError"
---

## Export

RequiredError

## Extends

- `Error`

## Constructors

### new RequiredError(field, msg)

> **new RequiredError**(`field`, `msg`?): [`RequiredError`](/reference/typescript/auth/client/classes/requirederror/)

#### Parameters

• **field**: `string`

• **msg?**: `string`

#### Returns

[`RequiredError`](/reference/typescript/auth/client/classes/requirederror/)

#### Overrides

`Error.constructor`

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:75](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L75)

## Properties

### cause?

> **`optional`** **cause**: `unknown`

#### Inherited from

`Error.cause`

#### Source

docs/node\_modules/typescript/lib/lib.es2022.error.d.ts:24

***

### field

> **field**: `string`

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:75](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L75)

***

### message

> **message**: `string`

#### Inherited from

`Error.message`

#### Source

docs/node\_modules/typescript/lib/lib.es5.d.ts:1077

***

### name

> **name**: `string` = `"RequiredError"`

#### Overrides

`Error.name`

#### Source

[clients/liquid-auth-client-js/src/client/api.ts:74](https://github.com/algorandfoundation/liquid-auth/blob/8878aa0007608386baa019f80c46f90dd8baec70/clients/liquid-auth-client-js/src/client/api.ts#L74)

***

### stack?

> **`optional`** **stack**: `string`

#### Inherited from

`Error.stack`

#### Source

docs/node\_modules/typescript/lib/lib.es5.d.ts:1078

***

### prepareStackTrace()?

> **`static`** **`optional`** **prepareStackTrace**: (`err`, `stackTraces`) => `any`

Optional override for formatting stack traces

#### See

https://v8.dev/docs/stack-trace-api#customizing-stack-traces

#### Parameters

• **err**: `Error`

• **stackTraces**: `CallSite`[]

#### Returns

`any`

#### Inherited from

`Error.prepareStackTrace`

#### Source

node\_modules/@types/node/globals.d.ts:11

***

### stackTraceLimit

> **`static`** **stackTraceLimit**: `number`

#### Inherited from

`Error.stackTraceLimit`

#### Source

node\_modules/@types/node/globals.d.ts:13

## Methods

### captureStackTrace()

> **`static`** **captureStackTrace**(`targetObject`, `constructorOpt`?): `void`

Create .stack property on a target object

#### Parameters

• **targetObject**: `object`

• **constructorOpt?**: `Function`

#### Returns

`void`

#### Inherited from

`Error.captureStackTrace`

#### Source

node\_modules/@types/node/globals.d.ts:4

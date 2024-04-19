---
editUrl: false
next: false
prev: false
title: "SignalClient"
---

## Extends

- `EventEmitter`

## Constructors

### new SignalClient(url, options)

> **new SignalClient**(`url`, `options`): [`SignalClient`](/reference/typescript/auth/signal/classes/signalclient/)

#### Parameters

• **url**: `string`

• **options**: `Partial`\<`ManagerOptions` & `SocketOptions`\>= `undefined`

#### Returns

[`SignalClient`](/reference/typescript/auth/signal/classes/signalclient/)

#### Overrides

`EventEmitter.constructor`

#### Source

[clients/liquid-auth-client-js/src/signal.ts:99](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L99)

## Properties

### peerClient

> **peerClient**: `RTCPeerConnection`

#### Source

[clients/liquid-auth-client-js/src/signal.ts:90](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L90)

***

### socket

> **socket**: `Socket`\<`DefaultEventsMap`, `DefaultEventsMap`\>

#### Source

[clients/liquid-auth-client-js/src/signal.ts:92](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L92)

***

### type

> **type**: `"offer"` \| `"answer"`

#### Source

[clients/liquid-auth-client-js/src/signal.ts:87](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L87)

***

### prefixed

> **`static`** **prefixed**: `string` \| `boolean`

#### Inherited from

`EventEmitter.prefixed`

#### Source

node\_modules/eventemitter3/index.d.ts:9

## Methods

### addListener()

> **addListener**\<`T`\>(`event`, `fn`, `context`?): `this`

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

• **fn**

• **context?**: `any`

#### Returns

`this`

#### Inherited from

`EventEmitter.addListener`

#### Source

node\_modules/eventemitter3/index.d.ts:45

***

### close()

> **close**(`disconnect`): `void`

#### Parameters

• **disconnect**: `boolean`= `false`

#### Returns

`void`

#### Source

[clients/liquid-auth-client-js/src/signal.ts:266](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L266)

***

### emit()

> **emit**\<`T`\>(`event`, ...`args`): `boolean`

Calls each of the listeners registered for a given event.

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

• ...**args**: `any`[]

#### Returns

`boolean`

#### Inherited from

`EventEmitter.emit`

#### Source

node\_modules/eventemitter3/index.d.ts:32

***

### eventNames()

> **eventNames**(): (`string` \| `symbol`)[]

Return an array listing the events for which the emitter has registered
listeners.

#### Returns

(`string` \| `symbol`)[]

#### Inherited from

`EventEmitter.eventNames`

#### Source

node\_modules/eventemitter3/index.d.ts:15

***

### link()

> **link**(`requestId`): `Promise`\<[`LinkMessage`](/reference/typescript/auth/signal/type-aliases/linkmessage/)\>

Await for a link message for a given requestId

#### Parameters

• **requestId**: `any`

#### Returns

`Promise`\<[`LinkMessage`](/reference/typescript/auth/signal/type-aliases/linkmessage/)\>

#### Source

[clients/liquid-auth-client-js/src/signal.ts:229](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L229)

***

### listenerCount()

> **listenerCount**(`event`): `number`

Return the number of listeners listening to a given event.

#### Parameters

• **event**: `string` \| `symbol`

#### Returns

`number`

#### Inherited from

`EventEmitter.listenerCount`

#### Source

node\_modules/eventemitter3/index.d.ts:27

***

### listeners()

> **listeners**\<`T`\>(`event`): (...`args`) => `void`[]

Return the listeners registered for a given event.

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

#### Returns

(...`args`) => `void`[]

#### Inherited from

`EventEmitter.listeners`

#### Source

node\_modules/eventemitter3/index.d.ts:20

***

### off()

> **off**\<`T`\>(`event`, `fn`?, `context`?, `once`?): `this`

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

• **fn?**

• **context?**: `any`

• **once?**: `boolean`

#### Returns

`this`

#### Inherited from

`EventEmitter.off`

#### Source

node\_modules/eventemitter3/index.d.ts:69

***

### on()

> **on**\<`T`\>(`event`, `fn`, `context`?): `this`

Add a listener for a given event.

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

• **fn**

• **context?**: `any`

#### Returns

`this`

#### Inherited from

`EventEmitter.on`

#### Source

node\_modules/eventemitter3/index.d.ts:40

***

### once()

> **once**\<`T`\>(`event`, `fn`, `context`?): `this`

Add a one-time listener for a given event.

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

• **fn**

• **context?**: `any`

#### Returns

`this`

#### Inherited from

`EventEmitter.once`

#### Source

node\_modules/eventemitter3/index.d.ts:54

***

### peer()

> **peer**(`requestId`, `type`, `config`?): `Promise`\<`RTCDataChannel`\>

# Create a peer connection

Send the nonce to the server and listen to a specified type.

## Offer
  - Will wait for an offer-description from the server
  - Will send an answer-description to the server
  - Will send candidates to the server

## Answer
 - Will send an offer-description to the server
 - Will wait for an answer-description from the server
 - Will send candidates to the server

#### Parameters

• **requestId**: `any`

• **type**: `"offer"` \| `"answer"`

• **config?**: `RTCConfiguration`

#### Returns

`Promise`\<`RTCDataChannel`\>

#### Source

[clients/liquid-auth-client-js/src/signal.ts:159](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L159)

***

### qrCode()

> **qrCode**(): `Promise`\<`any`\>

Create QR Code

#### Returns

`Promise`\<`any`\>

#### Source

[clients/liquid-auth-client-js/src/signal.ts:124](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L124)

***

### removeAllListeners()

> **removeAllListeners**(`event`?): `this`

Remove all listeners, or those of the specified event.

#### Parameters

• **event?**: `string` \| `symbol`

#### Returns

`this`

#### Inherited from

`EventEmitter.removeAllListeners`

#### Source

node\_modules/eventemitter3/index.d.ts:79

***

### removeListener()

> **removeListener**\<`T`\>(`event`, `fn`?, `context`?, `once`?): `this`

Remove the listeners of a given event.

#### Type parameters

• **T** extends `string` \| `symbol`

#### Parameters

• **event**: `T`

• **fn?**

• **context?**: `any`

• **once?**: `boolean`

#### Returns

`this`

#### Inherited from

`EventEmitter.removeListener`

#### Source

node\_modules/eventemitter3/index.d.ts:63

***

### signal()

> **signal**(`type`): `Promise`\<`RTCSessionDescriptionInit`\>

#### Parameters

• **type**: `"offer"` \| `"answer"`

#### Returns

`Promise`\<`RTCSessionDescriptionInit`\>

#### Source

[clients/liquid-auth-client-js/src/signal.ts:254](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L254)

***

### generateRequestId()

> **`static`** **generateRequestId**(): `number`

#### Returns

`number`

#### Source

[clients/liquid-auth-client-js/src/signal.ts:116](https://github.com/algorandfoundation/liquid-auth/blob/10c59840d062554c79d275cbb41957b40edae1ed/clients/liquid-auth-client-js/src/signal.ts#L116)

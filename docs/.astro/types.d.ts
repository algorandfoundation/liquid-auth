declare module 'astro:content' {
	interface Render {
		'.mdx': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	interface Render {
		'.md': Promise<{
			Content: import('astro').MarkdownInstance<{}>['Content'];
			headings: import('astro').MarkdownHeading[];
			remarkPluginFrontmatter: Record<string, any>;
		}>;
	}
}

declare module 'astro:content' {
	type Flatten<T> = T extends { [K: string]: infer U } ? U : never;

	export type CollectionKey = keyof AnyEntryMap;
	export type CollectionEntry<C extends CollectionKey> = Flatten<AnyEntryMap[C]>;

	export type ContentCollectionKey = keyof ContentEntryMap;
	export type DataCollectionKey = keyof DataEntryMap;

	type AllValuesOf<T> = T extends any ? T[keyof T] : never;
	type ValidContentEntrySlug<C extends keyof ContentEntryMap> = AllValuesOf<
		ContentEntryMap[C]
	>['slug'];

	export function getEntryBySlug<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		// Note that this has to accept a regular string too, for SSR
		entrySlug: E
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;

	export function getDataEntryById<C extends keyof DataEntryMap, E extends keyof DataEntryMap[C]>(
		collection: C,
		entryId: E
	): Promise<CollectionEntry<C>>;

	export function getCollection<C extends keyof AnyEntryMap, E extends CollectionEntry<C>>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => entry is E
	): Promise<E[]>;
	export function getCollection<C extends keyof AnyEntryMap>(
		collection: C,
		filter?: (entry: CollectionEntry<C>) => unknown
	): Promise<CollectionEntry<C>[]>;

	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(entry: {
		collection: C;
		slug: E;
	}): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(entry: {
		collection: C;
		id: E;
	}): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof ContentEntryMap,
		E extends ValidContentEntrySlug<C> | (string & {}),
	>(
		collection: C,
		slug: E
	): E extends ValidContentEntrySlug<C>
		? Promise<CollectionEntry<C>>
		: Promise<CollectionEntry<C> | undefined>;
	export function getEntry<
		C extends keyof DataEntryMap,
		E extends keyof DataEntryMap[C] | (string & {}),
	>(
		collection: C,
		id: E
	): E extends keyof DataEntryMap[C]
		? Promise<DataEntryMap[C][E]>
		: Promise<CollectionEntry<C> | undefined>;

	/** Resolve an array of entry references from the same collection */
	export function getEntries<C extends keyof ContentEntryMap>(
		entries: {
			collection: C;
			slug: ValidContentEntrySlug<C>;
		}[]
	): Promise<CollectionEntry<C>[]>;
	export function getEntries<C extends keyof DataEntryMap>(
		entries: {
			collection: C;
			id: keyof DataEntryMap[C];
		}[]
	): Promise<CollectionEntry<C>[]>;

	export function reference<C extends keyof AnyEntryMap>(
		collection: C
	): import('astro/zod').ZodEffects<
		import('astro/zod').ZodString,
		C extends keyof ContentEntryMap
			? {
					collection: C;
					slug: ValidContentEntrySlug<C>;
				}
			: {
					collection: C;
					id: keyof DataEntryMap[C];
				}
	>;
	// Allow generic `string` to avoid excessive type errors in the config
	// if `dev` is not running to update as you edit.
	// Invalid collection names will be caught at build time.
	export function reference<C extends string>(
		collection: C
	): import('astro/zod').ZodEffects<import('astro/zod').ZodString, never>;

	type ReturnTypeOrOriginal<T> = T extends (...args: any[]) => infer R ? R : T;
	type InferEntrySchema<C extends keyof AnyEntryMap> = import('astro/zod').infer<
		ReturnTypeOrOriginal<Required<ContentConfig['collections'][C]>['schema']>
	>;

	type ContentEntryMap = {
		"docs": {
"clients/Kotlin/introduction.md": {
	id: "clients/Kotlin/introduction.md";
  slug: "clients/kotlin/introduction";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"clients/TypeScript/attestation.md": {
	id: "clients/TypeScript/attestation.md";
  slug: "clients/typescript/attestation";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"clients/TypeScript/introduction.md": {
	id: "clients/TypeScript/introduction.md";
  slug: "clients/typescript/introduction";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"features.md": {
	id: "features.md";
  slug: "features";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"guides/authentication.md": {
	id: "guides/authentication.md";
  slug: "guides/authentication";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"guides/getting-started.md": {
	id: "guides/getting-started.md";
  slug: "guides/getting-started";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"guides/registration.md": {
	id: "guides/registration.md";
  slug: "guides/registration";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"guides/signalling.md": {
	id: "guides/signalling.md";
  slug: "guides/signalling";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"index.mdx": {
	id: "index.mdx";
  slug: "index";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".mdx"] };
"introduction.md": {
	id: "introduction.md";
  slug: "introduction";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"news.md": {
	id: "news.md";
  slug: "news";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/example.md": {
	id: "reference/example.md";
  slug: "reference/example";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/README.md": {
	id: "reference/typescript/auth/README.md";
  slug: "reference/typescript/auth/readme";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/functions/assertion.md": {
	id: "reference/typescript/auth/assertion/functions/assertion.md";
  slug: "reference/typescript/auth/assertion/functions/assertion";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/functions/decodeAssertionRequestOptions.md": {
	id: "reference/typescript/auth/assertion/functions/decodeAssertionRequestOptions.md";
  slug: "reference/typescript/auth/assertion/functions/decodeassertionrequestoptions";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/functions/encodeAuthenticatorAssertionResponse.md": {
	id: "reference/typescript/auth/assertion/functions/encodeAuthenticatorAssertionResponse.md";
  slug: "reference/typescript/auth/assertion/functions/encodeauthenticatorassertionresponse";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/functions/encodeCredential.md": {
	id: "reference/typescript/auth/assertion/functions/encodeCredential.md";
  slug: "reference/typescript/auth/assertion/functions/encodecredential";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/functions/fetchAssertionRequestOptions.md": {
	id: "reference/typescript/auth/assertion/functions/fetchAssertionRequestOptions.md";
  slug: "reference/typescript/auth/assertion/functions/fetchassertionrequestoptions";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/functions/fetchAssertionResponse.md": {
	id: "reference/typescript/auth/assertion/functions/fetchAssertionResponse.md";
  slug: "reference/typescript/auth/assertion/functions/fetchassertionresponse";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/type-aliases/EncodedAuthenticatorAssertionResponse.md": {
	id: "reference/typescript/auth/assertion/type-aliases/EncodedAuthenticatorAssertionResponse.md";
  slug: "reference/typescript/auth/assertion/type-aliases/encodedauthenticatorassertionresponse";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/type-aliases/EncodedCredential.md": {
	id: "reference/typescript/auth/assertion/type-aliases/EncodedCredential.md";
  slug: "reference/typescript/auth/assertion/type-aliases/encodedcredential";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/type-aliases/EncodedPublicKeyCredentialDescriptor.md": {
	id: "reference/typescript/auth/assertion/type-aliases/EncodedPublicKeyCredentialDescriptor.md";
  slug: "reference/typescript/auth/assertion/type-aliases/encodedpublickeycredentialdescriptor";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/assertion/type-aliases/EncodedPublicKeyCredentialRequestOptions.md": {
	id: "reference/typescript/auth/assertion/type-aliases/EncodedPublicKeyCredentialRequestOptions.md";
  slug: "reference/typescript/auth/assertion/type-aliases/encodedpublickeycredentialrequestoptions";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/attestation/functions/attestation.md": {
	id: "reference/typescript/auth/attestation/functions/attestation.md";
  slug: "reference/typescript/auth/attestation/functions/attestation";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/attestation/functions/fetchAttestationRequest.md": {
	id: "reference/typescript/auth/attestation/functions/fetchAttestationRequest.md";
  slug: "reference/typescript/auth/attestation/functions/fetchattestationrequest";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/attestation/functions/fetchAttestationResponse.md": {
	id: "reference/typescript/auth/attestation/functions/fetchAttestationResponse.md";
  slug: "reference/typescript/auth/attestation/functions/fetchattestationresponse";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/attestation/interfaces/EncodedAttestationCredential.md": {
	id: "reference/typescript/auth/attestation/interfaces/EncodedAttestationCredential.md";
  slug: "reference/typescript/auth/attestation/interfaces/encodedattestationcredential";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/attestation/interfaces/EncodedAuthenticatorAttestationResponse.md": {
	id: "reference/typescript/auth/attestation/interfaces/EncodedAuthenticatorAttestationResponse.md";
  slug: "reference/typescript/auth/attestation/interfaces/encodedauthenticatorattestationresponse";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/attestation/variables/DEFAULT_ATTESTATION_OPTIONS.md": {
	id: "reference/typescript/auth/attestation/variables/DEFAULT_ATTESTATION_OPTIONS.md";
  slug: "reference/typescript/auth/attestation/variables/default_attestation_options";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/AssertionApi.md": {
	id: "reference/typescript/auth/client/classes/AssertionApi.md";
  slug: "reference/typescript/auth/client/classes/assertionapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/AttestationApi.md": {
	id: "reference/typescript/auth/client/classes/AttestationApi.md";
  slug: "reference/typescript/auth/client/classes/attestationapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/AuthApi.md": {
	id: "reference/typescript/auth/client/classes/AuthApi.md";
  slug: "reference/typescript/auth/client/classes/authapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/BaseAPI.md": {
	id: "reference/typescript/auth/client/classes/BaseAPI.md";
  slug: "reference/typescript/auth/client/classes/baseapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/Configuration.md": {
	id: "reference/typescript/auth/client/classes/Configuration.md";
  slug: "reference/typescript/auth/client/classes/configuration";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/ConnectApi.md": {
	id: "reference/typescript/auth/client/classes/ConnectApi.md";
  slug: "reference/typescript/auth/client/classes/connectapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/RequiredError.md": {
	id: "reference/typescript/auth/client/classes/RequiredError.md";
  slug: "reference/typescript/auth/client/classes/requirederror";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/classes/WellKnownApi.md": {
	id: "reference/typescript/auth/client/classes/WellKnownApi.md";
  slug: "reference/typescript/auth/client/classes/wellknownapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AssertionApiFactory.md": {
	id: "reference/typescript/auth/client/functions/AssertionApiFactory.md";
  slug: "reference/typescript/auth/client/functions/assertionapifactory";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AssertionApiFetchParamCreator.md": {
	id: "reference/typescript/auth/client/functions/AssertionApiFetchParamCreator.md";
  slug: "reference/typescript/auth/client/functions/assertionapifetchparamcreator";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AssertionApiFp.md": {
	id: "reference/typescript/auth/client/functions/AssertionApiFp.md";
  slug: "reference/typescript/auth/client/functions/assertionapifp";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AttestationApiFactory.md": {
	id: "reference/typescript/auth/client/functions/AttestationApiFactory.md";
  slug: "reference/typescript/auth/client/functions/attestationapifactory";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AttestationApiFetchParamCreator.md": {
	id: "reference/typescript/auth/client/functions/AttestationApiFetchParamCreator.md";
  slug: "reference/typescript/auth/client/functions/attestationapifetchparamcreator";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AttestationApiFp.md": {
	id: "reference/typescript/auth/client/functions/AttestationApiFp.md";
  slug: "reference/typescript/auth/client/functions/attestationapifp";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AuthApiFactory.md": {
	id: "reference/typescript/auth/client/functions/AuthApiFactory.md";
  slug: "reference/typescript/auth/client/functions/authapifactory";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AuthApiFetchParamCreator.md": {
	id: "reference/typescript/auth/client/functions/AuthApiFetchParamCreator.md";
  slug: "reference/typescript/auth/client/functions/authapifetchparamcreator";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/AuthApiFp.md": {
	id: "reference/typescript/auth/client/functions/AuthApiFp.md";
  slug: "reference/typescript/auth/client/functions/authapifp";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/ConnectApiFactory.md": {
	id: "reference/typescript/auth/client/functions/ConnectApiFactory.md";
  slug: "reference/typescript/auth/client/functions/connectapifactory";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/ConnectApiFetchParamCreator.md": {
	id: "reference/typescript/auth/client/functions/ConnectApiFetchParamCreator.md";
  slug: "reference/typescript/auth/client/functions/connectapifetchparamcreator";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/ConnectApiFp.md": {
	id: "reference/typescript/auth/client/functions/ConnectApiFp.md";
  slug: "reference/typescript/auth/client/functions/connectapifp";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/WellKnownApiFactory.md": {
	id: "reference/typescript/auth/client/functions/WellKnownApiFactory.md";
  slug: "reference/typescript/auth/client/functions/wellknownapifactory";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/WellKnownApiFetchParamCreator.md": {
	id: "reference/typescript/auth/client/functions/WellKnownApiFetchParamCreator.md";
  slug: "reference/typescript/auth/client/functions/wellknownapifetchparamcreator";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/functions/WellKnownApiFp.md": {
	id: "reference/typescript/auth/client/functions/WellKnownApiFp.md";
  slug: "reference/typescript/auth/client/functions/wellknownapifp";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/AssertionCredentialJSON.md": {
	id: "reference/typescript/auth/client/interfaces/AssertionCredentialJSON.md";
  slug: "reference/typescript/auth/client/interfaces/assertioncredentialjson";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/AuthenticationExtensionsClientInputs.md": {
	id: "reference/typescript/auth/client/interfaces/AuthenticationExtensionsClientInputs.md";
  slug: "reference/typescript/auth/client/interfaces/authenticationextensionsclientinputs";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/AuthenticatorAssertionResponseJSON.md": {
	id: "reference/typescript/auth/client/interfaces/AuthenticatorAssertionResponseJSON.md";
  slug: "reference/typescript/auth/client/interfaces/authenticatorassertionresponsejson";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/ConfigurationParameters.md": {
	id: "reference/typescript/auth/client/interfaces/ConfigurationParameters.md";
  slug: "reference/typescript/auth/client/interfaces/configurationparameters";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/Credential.md": {
	id: "reference/typescript/auth/client/interfaces/Credential.md";
  slug: "reference/typescript/auth/client/interfaces/credential";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/FetchAPI.md": {
	id: "reference/typescript/auth/client/interfaces/FetchAPI.md";
  slug: "reference/typescript/auth/client/interfaces/fetchapi";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/FetchArgs.md": {
	id: "reference/typescript/auth/client/interfaces/FetchArgs.md";
  slug: "reference/typescript/auth/client/interfaces/fetchargs";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/LinkResponseDTO.md": {
	id: "reference/typescript/auth/client/interfaces/LinkResponseDTO.md";
  slug: "reference/typescript/auth/client/interfaces/linkresponsedto";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/PublicKeyCredentialRequestOptions.md": {
	id: "reference/typescript/auth/client/interfaces/PublicKeyCredentialRequestOptions.md";
  slug: "reference/typescript/auth/client/interfaces/publickeycredentialrequestoptions";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/interfaces/User.md": {
	id: "reference/typescript/auth/client/interfaces/User.md";
  slug: "reference/typescript/auth/client/interfaces/user";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/client/variables/COLLECTION_FORMATS.md": {
	id: "reference/typescript/auth/client/variables/COLLECTION_FORMATS.md";
  slug: "reference/typescript/auth/client/variables/collection_formats";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/classes/SignalClient.md": {
	id: "reference/typescript/auth/signal/classes/SignalClient.md";
  slug: "reference/typescript/auth/signal/classes/signalclient";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/functions/generateQRCode.md": {
	id: "reference/typescript/auth/signal/functions/generateQRCode.md";
  slug: "reference/typescript/auth/signal/functions/generateqrcode";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/type-aliases/LinkMessage.md": {
	id: "reference/typescript/auth/signal/type-aliases/LinkMessage.md";
  slug: "reference/typescript/auth/signal/type-aliases/linkmessage";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/variables/DEFAULT_QR_CODE_OPTIONS.md": {
	id: "reference/typescript/auth/signal/variables/DEFAULT_QR_CODE_OPTIONS.md";
  slug: "reference/typescript/auth/signal/variables/default_qr_code_options";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/variables/REQUEST_IN_PROCESS_MESSAGE.md": {
	id: "reference/typescript/auth/signal/variables/REQUEST_IN_PROCESS_MESSAGE.md";
  slug: "reference/typescript/auth/signal/variables/request_in_process_message";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/variables/REQUEST_IS_MISSING_MESSAGE.md": {
	id: "reference/typescript/auth/signal/variables/REQUEST_IS_MISSING_MESSAGE.md";
  slug: "reference/typescript/auth/signal/variables/request_is_missing_message";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/auth/signal/variables/UNAUTHENTICATED_MESSAGE.md": {
	id: "reference/typescript/auth/signal/variables/UNAUTHENTICATED_MESSAGE.md";
  slug: "reference/typescript/auth/signal/variables/unauthenticated_message";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/README.md": {
	id: "reference/typescript/core/README.md";
  slug: "reference/typescript/core/readme";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/functions/decodeAddress.md": {
	id: "reference/typescript/core/encoding/functions/decodeAddress.md";
  slug: "reference/typescript/core/encoding/functions/decodeaddress";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/functions/encodeAddress.md": {
	id: "reference/typescript/core/encoding/functions/encodeAddress.md";
  slug: "reference/typescript/core/encoding/functions/encodeaddress";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/functions/fromBase64Url.md": {
	id: "reference/typescript/core/encoding/functions/fromBase64Url.md";
  slug: "reference/typescript/core/encoding/functions/frombase64url";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/functions/toBase64URL.md": {
	id: "reference/typescript/core/encoding/functions/toBase64URL.md";
  slug: "reference/typescript/core/encoding/functions/tobase64url";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/variables/ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG.md": {
	id: "reference/typescript/core/encoding/variables/ALGORAND_ADDRESS_BAD_CHECKSUM_ERROR_MSG.md";
  slug: "reference/typescript/core/encoding/variables/algorand_address_bad_checksum_error_msg";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/variables/INVALID_BASE64URL_INPUT.md": {
	id: "reference/typescript/core/encoding/variables/INVALID_BASE64URL_INPUT.md";
  slug: "reference/typescript/core/encoding/variables/invalid_base64url_input";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/encoding/variables/MALFORMED_ADDRESS_ERROR_MSG.md": {
	id: "reference/typescript/core/encoding/variables/MALFORMED_ADDRESS_ERROR_MSG.md";
  slug: "reference/typescript/core/encoding/variables/malformed_address_error_msg";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/hi-base32/functions/decodeAsBytes.md": {
	id: "reference/typescript/core/hi-base32/functions/decodeAsBytes.md";
  slug: "reference/typescript/core/hi-base32/functions/decodeasbytes";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/hi-base32/functions/encodeBytes.md": {
	id: "reference/typescript/core/hi-base32/functions/encodeBytes.md";
  slug: "reference/typescript/core/hi-base32/functions/encodebytes";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/sha512/functions/createMethod.md": {
	id: "reference/typescript/core/sha512/functions/createMethod.md";
  slug: "reference/typescript/core/sha512/functions/createmethod";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"reference/typescript/core/sha512/variables/sha512_256.md": {
	id: "reference/typescript/core/sha512/variables/sha512_256.md";
  slug: "reference/typescript/core/sha512/variables/sha512_256";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"server/introduction.md": {
	id: "server/introduction.md";
  slug: "server/introduction";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
"server/proxy.md": {
	id: "server/proxy.md";
  slug: "server/proxy";
  body: string;
  collection: "docs";
  data: InferEntrySchema<"docs">
} & { render(): Render[".md"] };
};

	};

	type DataEntryMap = {
		
	};

	type AnyEntryMap = ContentEntryMap & DataEntryMap;

	export type ContentConfig = typeof import("../src/content/config.js");
}

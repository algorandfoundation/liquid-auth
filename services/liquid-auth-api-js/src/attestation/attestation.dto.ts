export type AttestationSelectorDto = {
  username: string;
  displayName: string;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  attestationType?: AttestationConveyancePreference;
  extensions?: AttestationExtension;
};

export type AttestationExtension = AuthenticationExtensionsClientInputs & {
  liquid: {
    type: string;
    signature: string;
    address: string;
    requestId: number;
    device?: string;
  };
};

import type { RegistrationResponseJSON } from '@simplewebauthn/server';

export type AttestationSelectorDto = {
  requestId?: string;
  username: string;
  displayName: string;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  attestationType?: AttestationConveyancePreference;
  extensions?: LiquidAttestationExtensionsClientInput;
};
export type AttestationCredentialJSONDto = RegistrationResponseJSON & {
  clientExtensionResults: LiquidAuthClientExtensionResults;
};

export type LiquidAuthClientExtensionResults = {
  liquid: {
    type: 'algorand';
    signature: string;
    address: string;

    device?: string;
    requestId?: string;
  };
};
export type LiquidAttestationExtensionsClientInput =
  AuthenticationExtensionsClientInputs & {
    liquid: boolean;
  };

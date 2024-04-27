import type { AttestationCredentialJSON } from '@simplewebauthn/typescript-types';

export type AttestationSelectorDto = {
  username: string;
  displayName: string;
  authenticatorSelection: AuthenticatorSelectionCriteria;
  attestationType?: AttestationConveyancePreference;
  extensions?: LiquidAttestationExtensionsClientInput;
};
export type AttestationCredentialJSONDto = AttestationCredentialJSON & {
  clientExtensionResults: LiquidAuthClientExtensionResults;
};

export type LiquidAuthClientExtensionResults = {
  liquid: {
    type: 'algorand';
    signature: string;
    address: string;

    device?: string;
    requestId?: string | number;
  };
};
export type LiquidAttestationExtensionsClientInput =
  AuthenticationExtensionsClientInputs & {
    liquid: boolean;
  };

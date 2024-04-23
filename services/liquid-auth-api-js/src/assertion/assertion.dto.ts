import {
  PublicKeyCredentialRequestOptionsJSON as PublicKeyCredentialRequestOptionsJSONType,
  PublicKeyCredentialDescriptorJSON as PublicKeyCredentialDescriptorJSONType,
  AssertionCredentialJSON as AssertionCredentialJSONType,
  AuthenticatorAssertionResponseJSON as AuthenticatorAssertionResponseJSONType,
  PublicKeyCredentialRequestOptions as PublicKeyCredentialRequestOptionsType,
} from '@simplewebauthn/typescript-types';
import { ApiProperty } from '@nestjs/swagger';

type AuthenticatorTransport = 'usb' | 'nfc' | 'ble' | 'internal';
// Native Types
export class PublicKeyCredentialDescriptor {
  @ApiProperty()
  id: BufferSource;
  @ApiProperty()
  transports: AuthenticatorTransport[];
  @ApiProperty()
  type: PublicKeyCredentialType;
}
export class AuthenticationExtensionsClientInputs {
  @ApiProperty()
  appid?: string;
  @ApiProperty()
  appidExclude?: string;
  @ApiProperty()
  uvm?: boolean;
  @ApiProperty()
  credProps?: boolean;
  @ApiProperty()
  hmacCreateSecret?: boolean;
  @ApiProperty()
  liquid?: boolean;
}

// Wrapped Implementations
export class PublicKeyCredentialRequestOptions
  implements PublicKeyCredentialRequestOptionsType
{
  @ApiProperty()
  allowCredentials: PublicKeyCredentialDescriptor[];
  @ApiProperty()
  challenge: BufferSource;
  @ApiProperty()
  extensions: AuthenticationExtensionsClientInputs;
  @ApiProperty()
  rpId: string;
  @ApiProperty()
  timeout: number;
  @ApiProperty()
  userVerification: UserVerificationRequirement;
}

export class AuthenticatorAssertionResponseJSON
  implements AuthenticatorAssertionResponseJSONType
{
  @ApiProperty()
  authenticatorData: string;
  @ApiProperty()
  clientDataJSON: string;
  @ApiProperty()
  signature: string;
  @ApiProperty()
  userHandle: string;
}

export class AssertionCredentialJSON implements AssertionCredentialJSONType {
  @ApiProperty()
  readonly id: string;
  @ApiProperty()
  rawId: string;
  @ApiProperty({ type: AuthenticatorAssertionResponseJSON })
  response: AuthenticatorAssertionResponseJSON;
  @ApiProperty()
  readonly type: string;
}
export type LiquidAssertionCredentialJSON = AssertionCredentialJSON & {
  clientExtensionResults: { liquid: { requestId: string } };
}

/**
 * JSON representation of PublicKeyCredentialRequestOptions
 */
export class PublicKeyCredentialRequestOptionsJSON
  implements PublicKeyCredentialRequestOptionsJSONType
{
  @ApiProperty()
  challenge: string;
  @ApiProperty()
  allowCredentials: PublicKeyCredentialDescriptorJSONType[];
  @ApiProperty()
  userVerification: UserVerificationRequirement;
  @ApiProperty()
  timeout: number;
  @ApiProperty()
  rpId: string;
  @ApiProperty()
  extensions: AuthenticationExtensionsClientInputs;
  constructor(partial: Partial<PublicKeyCredentialRequestOptionsJSONType>) {
    Object.assign(this, partial);
  }
}

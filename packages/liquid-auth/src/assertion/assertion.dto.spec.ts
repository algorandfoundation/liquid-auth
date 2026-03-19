import { PublicKeyCredentialRequestOptionsJSON } from './assertion.dto.js';

describe('AssertionDto', () => {
  it('should be defined', () => {
    const dto = new PublicKeyCredentialRequestOptionsJSON({
      challenge: 'hello world',
    });
    expect(dto).toBeDefined();
    expect(dto.challenge).toEqual('hello world');
  });
});

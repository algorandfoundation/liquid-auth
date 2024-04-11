import { dummyAttestationOptions } from '../../tests/constants.js';

export const mockAttestationService = {
  request: jest.fn().mockReturnValue(dummyAttestationOptions),
  response: jest.fn().mockReturnValue({}),
};

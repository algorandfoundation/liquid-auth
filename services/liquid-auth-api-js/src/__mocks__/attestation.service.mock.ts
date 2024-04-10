import { dummyAttestationOptions } from '../../tests/constants';

export const mockAttestationService = {
  request: jest.fn().mockReturnValue(dummyAttestationOptions),
  response: jest.fn().mockReturnValue({}),
};

import { dummyUsers, dummyOptions } from '../../tests/constants.js';

export const mockAssertionService = {
  request: jest.fn().mockReturnValue(dummyOptions),
  response: jest.fn().mockReturnValue(dummyUsers[0]),
};

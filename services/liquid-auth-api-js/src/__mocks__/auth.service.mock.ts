import { dummyUsers } from 'tests/constants';

const dummyUser = dummyUsers[0];

export const mockAuthService = {
  init: jest.fn().mockResolvedValue(dummyUser),
  create: jest.fn().mockResolvedValue(dummyUser),
  find: jest.fn().mockResolvedValue(dummyUser),
  search: jest.fn().mockResolvedValue(dummyUser),
  update: jest.fn().mockResolvedValue(dummyUser),
  findCredential: jest.fn().mockResolvedValue(dummyUser.credentials[0]),
  addCredential: jest.fn().mockResolvedValue(dummyUser),
  removeCredential: jest.fn().mockResolvedValue(dummyUser),
  all: jest.fn().mockResolvedValue(dummyUsers),
};

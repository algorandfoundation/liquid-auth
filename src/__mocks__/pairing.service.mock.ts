export const mockPairingService = {
  createInvitation: jest.fn(),
  bindInvitation: jest.fn(async (requestId: string) => ({
    pairingId: requestId,
  })),
  approveInvitation: jest.fn(async (pairingId: string) => ({
    version: 2,
    pairingId,
    role: 'controller' as const,
    credential: 'controller-credential',
  })),
  findActivePairing: jest.fn(),
  authenticateCredential: jest.fn(async (pairingId: string, role: string) => ({
    version: 2,
    pairingId,
    role,
    status: 'active' as const,
  })),
  revoke: jest.fn(),
};

import { Test, TestingModule } from '@nestjs/testing';
import { SignalsGateway } from './signals.gateway';
import { Server, Socket } from "socket.io";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const candidateFixture = require('./__fixtures__/candidate.fixture.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdpFixtures = require('./__fixtures__/sdp.fixtures.json');

const clientFixture = {
  request: {
    session: {
      wallet: 'AVALIDWALLETADDRESS',
    },
  },
} as unknown as Socket;

jest.mock('socket.io', () => {
  return {
    Server: jest.fn().mockImplementation(() => {
      return {
        emit: jest.fn(),
        in: jest.fn().mockReturnThis(),
      };
    }),
  };
});

describe('SignalsGateway', () => {
  let gateway: SignalsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SignalsGateway],
    }).compile();

    gateway = module.get<SignalsGateway>(SignalsGateway);
    gateway.server = new Server();
  });
  it('should signal a call-description', () => {
    gateway.onCallDescription(sdpFixtures.call, clientFixture);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientFixture.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'call-description',
      sdpFixtures.call,
    );
  });
  it('should signal a call-candidate', () => {
    gateway.onCallCandidate(candidateFixture, clientFixture);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientFixture.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'call-candidate',
      candidateFixture,
    );
  });
  it('should signal a answer-description', () => {
    gateway.onAnswerDescription(sdpFixtures.answer, clientFixture);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientFixture.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'answer-description',
      sdpFixtures.answer,
    );
  });
  it('should signal a answer-candidate', () => {
    gateway.onAnswerCandidate(candidateFixture, clientFixture);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientFixture.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'answer-candidate',
      candidateFixture,
    );
  });
});

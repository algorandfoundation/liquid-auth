import { Test, TestingModule } from '@nestjs/testing';
import { SignalsGateway } from './signals.gateway.js';
import { Server, Socket } from 'socket.io';
import mongoose, { Model } from 'mongoose';
import { User, UserSchema } from '../auth/auth.schema.js';
import { AuthService } from '../auth/auth.service.js';
import { getModelToken } from '@nestjs/mongoose';
import { mockAuthService } from '../__mocks__/auth.service.mock.js';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const candidateFixture = require('./__fixtures__/candidate.fixture.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sdpFixtures = require('./__fixtures__/sdp.fixtures.json');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sessionFixtures = require('../__fixtures__/session.fixtures.json');

const clientFixture = {
  request: {
    session: sessionFixtures.authorized,
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

describe.skip('SignalsGateway', () => {
  let gateway: SignalsGateway;
  let userModel: Model<User>;
  beforeEach(async () => {
    userModel = mongoose.model('User', UserSchema);
    // TODO: Session Mock
    Object.keys(sessionFixtures).forEach((key) => {
      sessionFixtures[key].reload = jest.fn(async () => {});
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: getModelToken(User.name),
          useValue: userModel,
        },
        {
          provide: AuthService,
          useValue: { ...mockAuthService },
        },
        SignalsGateway,
      ],
    }).compile();

    gateway = module.get<SignalsGateway>(SignalsGateway);
    gateway.server = new Server();
  });
  it('should signal a offer-description', () => {
    gateway.onCallDescription(sdpFixtures.call, clientFixture);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientFixture.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-description',
      sdpFixtures.call,
    );
  });
  it('should signal a offer-candidate', () => {
    gateway.onCallCandidate(candidateFixture, clientFixture);
    expect(gateway.server.in).toHaveBeenCalledWith(
      (clientFixture.request as any).session.wallet,
    );
    expect(gateway.server.emit).toHaveBeenCalledWith(
      'offer-candidate',
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

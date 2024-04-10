import { SignalsInterceptor } from './signals.interceptor';
import { ExecutionContext } from '@nestjs/common';
import { of } from 'rxjs';

function createExecutionContextMock(sessionFixture = {}): {
  executionContext: ExecutionContext;
  disconnect: jest.Mock;
} {
  const disconnect = jest.fn();
  return {
    executionContext: {
      getArgByIndex: jest.fn().mockReturnThis(),
      getArgs: jest.fn().mockReturnThis(),
      getType: jest.fn().mockReturnThis(),
      switchToWs: jest.fn().mockReturnValue({
        getClient: jest.fn().mockReturnValue({
          disconnect,
          request: { session: sessionFixture },
        }),
      }),
      switchToHttp: jest.fn().mockReturnThis(),
      switchToRpc: jest.fn().mockReturnThis(),
      getClass: () =>
        ({
          name: 'something',
        }) as any,
      getHandler: () =>
        ({
          name: 'something',
        }) as any,
    },
    disconnect,
  };
}

const next = {
  handle: jest.fn(() => of()),
};
describe('ConnectInterceptor', () => {
  let interceptor: SignalsInterceptor;

  beforeEach(() => {
    interceptor = new SignalsInterceptor();
  });
  it('should disconnect a invalid session', (done) => {
    expect(interceptor).toBeDefined();
    const { executionContext, disconnect } = createExecutionContextMock({});
    const response = interceptor.intercept(executionContext, next);

    response.subscribe({
      next: () => {
        expect(disconnect).toHaveBeenCalled();
      },
      error: (error) => {
        throw error;
      },
      complete: () => {
        expect(disconnect).toBeCalledTimes(1);
        done();
      },
    });
  });
  it('should continue with a valid session', (done) => {
    expect(interceptor).toBeDefined();
    const { executionContext, disconnect } = createExecutionContextMock({
      wallet: 'AVALIDWALLETADDRESS',
    });
    const response = interceptor.intercept(executionContext, next);

    response.subscribe({
      next: () => {
        expect(disconnect).not.toHaveBeenCalled();
      },
      error: (error) => {
        throw error;
      },
      complete: () => {
        expect(disconnect).toBeCalledTimes(0);
        done();
      },
    });
  });
});

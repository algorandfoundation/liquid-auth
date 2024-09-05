import { AuthGuard } from './auth.guard.js';
import { ExecutionContext } from '@nestjs/common';
import sessionFixtures from '../__fixtures__/session.fixtures.json';
describe('AuthGuard', () => {
  const mockExecutionContext: Partial<
    Record<
      jest.FunctionPropertyNames<ExecutionContext>,
      jest.MockedFunction<any>
    >
  > = {
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest
        .fn()
        .mockReturnValue({ session: sessionFixtures.authorized }),
      getResponse: jest.fn().mockReturnThis(),
    }),
  };
  it('should be defined', () => {
    expect(new AuthGuard()).toBeDefined();
  });
  it('should guard a route', () => {
    const guard = new AuthGuard();
    expect(guard.canActivate(mockExecutionContext as ExecutionContext)).toBe(
      true,
    );
  });
});

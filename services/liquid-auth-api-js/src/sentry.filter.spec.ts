const captureException = jest.fn();
const catchFn = jest.fn();
import { SentryFilter } from './sentry.filter.js';
import { ArgumentsHost } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

jest.mock('@sentry/node', () => ({
  captureException,
}));

BaseExceptionFilter.prototype.catch = catchFn;

describe('SentryFilter', () => {
  it('should catch exceptions', () => {
    const sentryFilter = new SentryFilter();
    const exception = new Error('test error');
    const host = {} as unknown as ArgumentsHost;
    expect(() => {
      sentryFilter.catch(exception, host);
    }).not.toThrow();
    expect(captureException).toHaveBeenCalledWith(exception);
    expect(catchFn).toHaveBeenCalledWith(exception, host);
  });
});

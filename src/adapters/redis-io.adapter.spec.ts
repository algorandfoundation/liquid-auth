import { RedisIoAdapter } from './redis-io.adapter.js';
describe('RedisIoAdapter', () => {
  it('should create an instance', () => {
    const adapter = new RedisIoAdapter(null, null);
    expect(adapter).toBeInstanceOf(RedisIoAdapter);
  });
});

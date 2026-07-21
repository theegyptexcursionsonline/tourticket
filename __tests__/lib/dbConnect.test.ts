import { connectWithTransientRetry, isTransientMongoConnectionError } from '@/lib/mongoConnectionPolicy';

describe('MongoDB connection retry classification', () => {
  test.each([
    ['MongoNetworkError', 'Client network socket disconnected before secure TLS connection was established'],
    ['MongooseServerSelectionError', 'Server selection timed out after 10000 ms'],
    ['Error', 'read ECONNRESET'],
  ])('retries transient %s failures', (name, message) => {
    const error = new Error(message);
    error.name = name;
    expect(isTransientMongoConnectionError(error)).toBe(true);
  });

  it('does not retry configuration or authentication failures', () => {
    expect(isTransientMongoConnectionError(new Error('bad auth : Authentication failed.'))).toBe(false);
    expect(isTransientMongoConnectionError('not an error')).toBe(false);
  });

  it('retries one transient failure and returns the second result', async () => {
    const tlsError = Object.assign(new Error('secure TLS connection failed'), { name: 'MongoNetworkError' });
    const connect = jest.fn().mockRejectedValueOnce(tlsError).mockResolvedValueOnce('connected');
    const pause = jest.fn().mockResolvedValue(undefined);
    await expect(connectWithTransientRetry(connect, pause)).resolves.toBe('connected');
    expect(connect).toHaveBeenCalledTimes(2);
    expect(pause).toHaveBeenCalledTimes(1);
  });

  it('does not retry a second transient failure', async () => {
    const tlsError = Object.assign(new Error('secure TLS connection failed'), { name: 'MongoNetworkError' });
    const connect = jest.fn().mockRejectedValue(tlsError);
    await expect(connectWithTransientRetry(connect, async () => undefined)).rejects.toBe(tlsError);
    expect(connect).toHaveBeenCalledTimes(2);
  });
});

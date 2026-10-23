import { supportsWebGL2 } from '../webglSupport';

describe('supportsWebGL2', () => {
  const realGetContext = HTMLCanvasElement.prototype.getContext;
  afterEach(() => {
    HTMLCanvasElement.prototype.getContext = realGetContext;
  });

  function stubGetContext(impl: (kind: string) => unknown) {
    HTMLCanvasElement.prototype.getContext = jest.fn(impl) as unknown as typeof realGetContext;
  }

  it('is false when the browser cannot create a WebGL2 context', () => {
    stubGetContext(() => null);
    expect(supportsWebGL2()).toBe(false);
  });

  it('is false when asking for a context throws', () => {
    stubGetContext(() => { throw new Error('blocked'); });
    expect(supportsWebGL2()).toBe(false);
  });

  it('is true for a WebGL2 context and releases the probe context', () => {
    const loseContext = jest.fn();
    stubGetContext((kind) => (kind === 'webgl2' ? { getExtension: () => ({ loseContext }) } : null));
    expect(supportsWebGL2()).toBe(true);
    expect(loseContext).toHaveBeenCalledTimes(1);
  });

  it('asks only for WebGL2, never falling back to WebGL1', () => {
    const kinds: string[] = [];
    stubGetContext((kind) => { kinds.push(kind); return kind === 'webgl' ? {} : null; });
    expect(supportsWebGL2()).toBe(false);
    expect(kinds).toEqual(['webgl2']);
  });
});

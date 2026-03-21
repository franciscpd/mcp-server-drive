import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('logger', () => {
  let stderrSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.resetModules();
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
  });

  afterEach(() => {
    stderrSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('writes info messages at default level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const { logger } = await import('./logger.js');
    logger.info('test message');
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('[drive-mcp]');
    expect(output).toContain('INFO');
    expect(output).toContain('test message');
    expect(output).toMatch(/\d{4}-\d{2}-\d{2}T/);
    expect(output.endsWith('\n')).toBe(true);
  });

  it('writes error messages at default level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const { logger } = await import('./logger.js');
    logger.error('error msg');
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('ERROR');
  });

  it('suppresses debug messages at default level', async () => {
    vi.stubEnv('LOG_LEVEL', '');
    const { logger } = await import('./logger.js');
    logger.debug('debug msg');
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  it('shows debug messages when LOG_LEVEL=debug', async () => {
    vi.stubEnv('LOG_LEVEL', 'debug');
    const { logger } = await import('./logger.js');
    logger.debug('debug msg');
    expect(stderrSpy).toHaveBeenCalledOnce();
    const output = stderrSpy.mock.calls[0][0] as string;
    expect(output).toContain('DEBUG');
  });

  it('suppresses info when LOG_LEVEL=error', async () => {
    vi.stubEnv('LOG_LEVEL', 'error');
    const { logger } = await import('./logger.js');
    logger.info('info msg');
    expect(stderrSpy).not.toHaveBeenCalled();
  });
});

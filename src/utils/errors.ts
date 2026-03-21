export const ErrorCategory = {
  AUTH: 'Authentication failed. Check your OAuth credentials.',
  FORBIDDEN:
    'Insufficient permissions. Ensure the required Google API is enabled and correct OAuth scopes are granted.',
  RATE_LIMIT: 'Drive API rate limit exceeded. Try again in a few seconds.',
  BAD_REQUEST: (detail: string) => `Bad request: ${detail}`,
  NOT_FOUND: (resource: string) => `${resource} not found.`,
  CONFLICT:
    'File conflict. The file may have been modified or a name collision occurred.',
  QUOTA:
    'Storage quota exceeded. Free up space or upgrade your Google Drive plan.',
  VALIDATION: (detail: string) => `Invalid parameter: ${detail}`,
  NETWORK: 'Failed to connect to Google API. Check your network.',
} as const;

export function toolError(message: string) {
  return {
    isError: true as const,
    content: [{ type: 'text' as const, text: message }],
  };
}

export function sanitizeMessage(message: string): string {
  let sanitized = message.replace(/ya29\.[^\s]*/g, '[REDACTED]');
  sanitized = sanitized.replace(/1\/\/[^\s]*/g, '[REDACTED]');
  if (sanitized.length > 200) {
    sanitized = sanitized.slice(0, 197) + '...';
  }
  return sanitized;
}

export interface GaxiosErrorLike {
  response?: {
    status?: number;
    data?: { error?: { message?: string } };
  };
  code?: string;
}

export function categorizeError(error: Error): string {
  const gaxios = error as Error & GaxiosErrorLike;
  const status = gaxios.response?.status;

  if (status === 400) {
    const detail = gaxios.response?.data?.error?.message ?? error.message;
    return ErrorCategory.BAD_REQUEST(detail);
  }
  if (status === 401) return ErrorCategory.AUTH;
  if (status === 403) return ErrorCategory.FORBIDDEN;
  if (status === 404) return ErrorCategory.NOT_FOUND('Resource');
  if (status === 409) return ErrorCategory.CONFLICT;
  if (status === 429) return ErrorCategory.RATE_LIMIT;
  if (status === 507) return ErrorCategory.QUOTA;

  if (gaxios.code === 'ENOTFOUND' || gaxios.code === 'ECONNREFUSED') {
    return ErrorCategory.NETWORK;
  }

  if (/quota/i.test(error.message)) {
    return ErrorCategory.QUOTA;
  }

  return sanitizeMessage(error.message);
}

export async function safeToolHandler<T>(
  fn: () => Promise<T>,
): Promise<T | ReturnType<typeof toolError>> {
  try {
    return await fn();
  } catch (error) {
    if (error instanceof Error) {
      return toolError(categorizeError(error));
    }
    return toolError('Unknown error');
  }
}

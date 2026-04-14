export function apiErrorMessage(error: unknown, fallback: string): string {
  const candidate = error as {
    error?: { message?: string; errors?: Record<string, string[]> };
    message?: string;
  };

  const topMessage = candidate?.error?.message ?? candidate?.message;
  const validationErrors = candidate?.error?.errors;

  if (validationErrors && Object.keys(validationErrors).length > 0) {
    const flattened = Object.entries(validationErrors)
      .flatMap(([field, messages]) => (messages ?? []).map((message) => `${field}: ${message}`))
      .join(' | ');

    if (topMessage && topMessage !== 'The given data was invalid.') {
      return `${topMessage} (${flattened})`;
    }

    return flattened || fallback;
  }

  return topMessage ?? fallback;
}

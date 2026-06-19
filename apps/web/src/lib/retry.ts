export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxRetries?: number;
    baseDelayMs?: number;
    onRetry?: (attempt: number, error: unknown) => void;
  } = {}
): Promise<T> {
  const maxRetries = options.maxRetries ?? 3;
  const baseDelayMs = options.baseDelayMs ?? 1000;

  for (let attempt = 1; ; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt > maxRetries) throw error;
      options.onRetry?.(attempt, error);
      const delay = baseDelayMs * Math.pow(2, attempt - 1) + Math.random() * 500;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

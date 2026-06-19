export async function chunkedMap<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  chunkSize = 25,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = await Promise.allSettled(chunk.map((item, j) => fn(item, i + j)));
    results.push(...chunkResults);
  }

  return results;
}

export function countFulfilled<T>(results: PromiseSettledResult<T>[]): number {
  return results.filter((r) => r.status === "fulfilled").length;
}

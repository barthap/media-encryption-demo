export async function benchmarked<T>(name: string, block: () => Promise<T>): Promise<T> {
  const timeStart = Date.now();
  try {
    return await block();
  } finally {
    const elapsed = Date.now() - timeStart;
    console.log(`[benchmark] ${name} took ${elapsed}ms.`);
  }
}

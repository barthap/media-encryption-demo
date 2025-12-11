export function messageForException(e: unknown): string | null {
  if (typeof e === 'string') {
    return e;
  }

  if (e instanceof Error) {
    return e.message;
  }

  return null;
}

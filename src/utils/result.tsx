import { messageForException } from "./error"

export type Result<T, E = unknown> = {
  success: true,
  value: T
} | {
  success: false,
  error: E,
  reason: string,
}

export const Result = {
  Ok<T, E>(value: T): Result<T, E> {
    return { success: true, value }
  },

  Err<T, E>(error: E): Result<T, E> {
    return {
      success: false,
      error,
      reason: messageForException(error) ?? 'Unknown error'
    };
  }
}

/**
 * A wrapper over `try-catch` created mainly because React Compiler sucks at optimizing code
 * inside try-catch. It doesn't support e.g. ternary ?: operators or throwing inside try block.
 * 
 * @param block Code that would go inside a `try { ... }` block
 */
export function runCatching<T, E = unknown>(block: () => Promise<T>): Promise<Result<T, E>>;
export function runCatching<T, E = unknown>(block: () => T): Result<T, E>;
export function runCatching<T, E = unknown>(block: () => T | Promise<T>): Result<T, E> | Promise<Result<T, E>> {
  try {
    const blockOutput = block();
    if (blockOutput instanceof Promise) {
      return blockOutput.then(value => Result.Ok<T, E>(value), err => Result.Err<T, E>(err));
    }

    return Result.Ok(blockOutput);
  } catch (e) {
    return Result.Err(e as E);
  }
}

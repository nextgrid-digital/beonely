/**
 * Rejects if `promise` does not settle within `ms` milliseconds.
 */
export function withTimeout<T> (
  promise: Promise<T>,
  ms: number,
  message = `Request timed out after ${ms}ms`
): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(message))
    }, ms)
    void promise
      .then((v) => {
        clearTimeout(t)
        resolve(v)
      })
      .catch((e: unknown) => {
        clearTimeout(t)
        reject(e)
      })
  })
}

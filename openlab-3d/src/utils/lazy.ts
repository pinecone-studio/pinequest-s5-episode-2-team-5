/** Create a value once, on first use. Used for module-level shared geometries. */
export function lazy<T>(factory: () => T): () => T {
  let value: T | undefined;
  let made = false;
  return () => {
    if (!made) {
      value = factory();
      made = true;
    }
    return value as T;
  };
}

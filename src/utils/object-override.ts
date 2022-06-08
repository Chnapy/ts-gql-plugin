export const objectOverride =
  <O>(obj: O) =>
  <K extends keyof O>(fnKey: K, fn: (initialFn: O[K]) => O[K]) => {
    obj[fnKey] = fn(obj[fnKey]);
  };

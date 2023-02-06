import { isVSCodeEnv } from './is-vscode-env';
import fs from 'node:fs';

type SyncOrAsync<V, A extends boolean> = A extends true ? Promise<V> : V;

const getToSyncOrAsync =
  <A extends boolean>(async: A) =>
  <V>(value: V): SyncOrAsync<Awaited<V>, A> => {
    if (value instanceof Promise || !async) {
      return value as SyncOrAsync<Awaited<V>, A>;
    }

    return Promise.resolve(value) as SyncOrAsync<Awaited<V>, A>;
  };

const isAsync = <V>(
  value: SyncOrAsync<V, boolean>
): value is SyncOrAsync<V, true> => value instanceof Promise;

type SyncOrAsyncBased<O, I, A extends boolean> = {
  async: A;
  create: (input: I) => SyncOrAsync<O, A>;
  checkValidity: (currentItem: CacheItem<O, I, A>) => SyncOrAsync<boolean, A>;
};

type CacheSystemOptions<O, I, A extends boolean> = {
  getKeyFromInput: (input: I) => string;
  // TODO debounce
  // debounceValue?: number;
  sizeLimit?: number;
} & SyncOrAsyncBased<O, I, A>;

type CacheSystem<O, I, A extends boolean> = {
  getItemOrCreate: (input: I) => SyncOrAsync<O, A>;
  checkItemValidity: (input: I) => SyncOrAsync<boolean, A>;
};

export type CacheItem<O, I, A extends boolean> = {
  input: I;
  value: SyncOrAsync<O, A>;
  dateTime: number;
};

export const checkFileLastUpdate = (filePath: string, lastDateTime: number) => {
  const { mtimeMs } = fs.statSync(filePath);

  return mtimeMs <= lastDateTime;
};

export const createCacheSystem = <O, I, A extends boolean>({
  getKeyFromInput,
  sizeLimit = 100,
  ...syncOrAsyncOptions
}: CacheSystemOptions<O, I, A>): CacheSystem<O, I, A> => {
  const map = new Map<string, CacheItem<O, I, A>>();

  const options = syncOrAsyncOptions as
    | SyncOrAsyncBased<O, I, true>
    | SyncOrAsyncBased<O, I, false>;

  const toSyncOrAsync = getToSyncOrAsync(syncOrAsyncOptions.async);

  const vsCodeEnv = isVSCodeEnv();

  const checkCacheSize = () => {
    if (map.size > sizeLimit) {
      const entries = [...map.entries()].sort(([_1, val1], [_2, val2]) =>
        val1.dateTime < val2.dateTime ? -1 : 1
      );

      const toDelete = entries.slice(0, map.size / 2);
      toDelete.forEach(([key]) => map.delete(key));
    }
  };

  const createAndAddToMap = (input: I): SyncOrAsync<O, A> => {
    const key = getKeyFromInput(input);

    const getValue = (): SyncOrAsync<O, A> => {
      if (options.async) {
        return toSyncOrAsync(
          options.create(input).then((finalValue) => {
            if (finalValue === null) {
              map.delete(key);
            }

            return finalValue;
          })
        );
      }

      const value = options.create(input);

      return toSyncOrAsync(value);
    };

    const value = getValue();

    map.set(key, {
      input,
      value,
      dateTime: Date.now(),
    });

    checkCacheSize();

    return value;
  };

  return {
    getItemOrCreate: (input) => {
      const key = getKeyFromInput(input);

      const item = map.get(key);
      if (!item) {
        return createAndAddToMap(input);
      }

      // TODO debounce
      // if (debounceValue && Date.now() - item.dateTime < debounceValue) {
      //   return item.value;
      // }

      if (vsCodeEnv) {
        const isValidRaw = syncOrAsyncOptions.checkValidity(item);
        if (isAsync(isValidRaw)) {
          return toSyncOrAsync(
            isValidRaw.then((isValid) => {
              if (!isValid) {
                return createAndAddToMap(input);
              }

              item.dateTime = Date.now();

              return item.value;
            })
          );
        }

        if (!isValidRaw) {
          return createAndAddToMap(input);
        }

        item.dateTime = Date.now();
      }

      return item.value;
    },

    checkItemValidity: (input) => {
      const key = getKeyFromInput(input);

      const item = map.get(key);
      if (!item) {
        return toSyncOrAsync(false);
      }

      if (!vsCodeEnv) {
        return toSyncOrAsync(true);
      }

      // TODO debounce

      return syncOrAsyncOptions.checkValidity(item);
    },
  };
};

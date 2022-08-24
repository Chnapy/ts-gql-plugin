import { isVSCodeEnv } from './is-vscode-env';
import fs from 'node:fs';

type CacheSystemOptions<O, I> = {
  getKeyFromInput: (input: I) => string;
  create: (input: I) => Promise<O>;
  checkValidity: (currentItem: CacheItem<O, I>) => Promise<boolean>;
  // TODO debounce
  // debounceValue?: number;
  sizeLimit?: number;
};

type CacheItem<O, I> = {
  input: I;
  value: Promise<O>;
  dateTime: number;
};

export const checkFileLastUpdate = (filePath: string, lastDateTime: number) => {
  const { mtimeMs } = fs.statSync(filePath);

  return mtimeMs <= lastDateTime;
};

export const createCacheSystem = <O, I>({
  getKeyFromInput,
  create,
  checkValidity,
  sizeLimit = 100,
}: CacheSystemOptions<O, I>) => {
  const map = new Map<string, CacheItem<O, I>>();

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

  const createAndAddToMap = (input: I) => {
    const key = getKeyFromInput(input);

    const value = create(input).then((finalValue) => {
      if (finalValue === null) {
        map.delete(key);
      }

      return finalValue;
    });

    map.set(key, {
      input,
      value,
      dateTime: Date.now(),
    });

    checkCacheSize();

    return value;
  };

  return {
    getItemOrCreate: async (input: I): Promise<O> => {
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
        const isValid = await checkValidity(item);
        if (!isValid) {
          return createAndAddToMap(input);
        }

        item.dateTime = Date.now();
      }

      return item.value;
    },

    checkItemValidity: async (input: I): Promise<boolean> => {
      const key = getKeyFromInput(input);

      const item = map.get(key);
      if (!item) {
        return false;
      }

      if (!vsCodeEnv) {
        return true;
      }

      // TODO debounce

      return await checkValidity(item);
    },
  };
};

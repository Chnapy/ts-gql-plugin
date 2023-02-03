import { createCacheSystem } from './cache-system';

describe('Cache system', () => {
  describe('getItemOrCreate', () => {
    it('creates new item on empty cache', async () => {
      const create = vi.fn(async ({ inputValue }) => inputValue.length);
      const checkValidity = vi.fn(async () => true);

      const cache = createCacheSystem<number, { inputValue: string }, true>({
        async: true,
        getKeyFromInput: ({ inputValue }) => inputValue,
        create,
        checkValidity,
      });

      const value = await cache.getItemOrCreate({
        inputValue: 'foobar',
      });

      expect(create).toHaveBeenCalledOnce();
      expect(checkValidity).not.toHaveBeenCalled();
      expect(value).toEqual(6);
    });

    it('creates new item on empty cache, in sync mode', () => {
      const create = vi.fn(({ inputValue }) => inputValue.length);
      const checkValidity = vi.fn(() => true);

      const cache = createCacheSystem<number, { inputValue: string }, false>({
        async: false,
        getKeyFromInput: ({ inputValue }) => inputValue,
        create,
        checkValidity,
      });

      const value = cache.getItemOrCreate({
        inputValue: 'foobar',
      });

      expect(create).toHaveBeenCalledOnce();
      expect(checkValidity).not.toHaveBeenCalled();
      expect(value).toEqual(6);
    });

    it('creates new item with different input', async () => {
      const create = vi.fn(async ({ inputValue }) => ({
        length: inputValue.length,
      }));
      const checkValidity = vi.fn(async () => true);

      const cache = createCacheSystem<
        { length: number },
        { inputValue: string },
        true
      >({
        async: true,
        getKeyFromInput: ({ inputValue }) => inputValue.length.toString(),
        create,
        checkValidity,
      });

      const firstValue = await cache.getItemOrCreate({
        inputValue: 'foobar',
      });
      const secondValue = await cache.getItemOrCreate({
        inputValue: 'toto',
      });

      expect(create).toHaveBeenCalledTimes(2);
      expect(checkValidity).not.toHaveBeenCalled();
      expect(secondValue).toEqual({ length: 4 });
      expect(secondValue).not.toBe(firstValue);
    });

    it('gives existing item with new input giving existing key', async () => {
      const create = vi.fn(async ({ inputValue }) => ({
        length: inputValue.length,
      }));
      const checkValidity = vi.fn(async () => true);

      const cache = createCacheSystem<
        { length: number },
        { inputValue: string },
        true
      >({
        async: true,
        getKeyFromInput: ({ inputValue }) => inputValue.length.toString(),
        create,
        checkValidity,
      });

      const firstValue = await cache.getItemOrCreate({
        inputValue: 'foobar',
      });
      const secondValue = await cache.getItemOrCreate({
        inputValue: 'barfoo',
      });

      expect(create).toHaveBeenCalledOnce();
      expect(checkValidity).not.toHaveBeenCalled();
      expect(firstValue).toBe(secondValue);
    });

    it('deletes item on value promise resolved to `null`', async () => {
      const create = vi.fn(async ({ inputValue }) =>
        inputValue === 'foobar' ? { length: inputValue.length } : null
      );
      const checkValidity = vi.fn(async () => true);

      const cache = createCacheSystem<
        { length: number } | null,
        { inputValue: string },
        true
      >({
        async: true,
        getKeyFromInput: ({ inputValue }) => inputValue,
        create,
        checkValidity,
      });

      await cache.getItemOrCreate({
        inputValue: 'foobar',
      });
      await cache.getItemOrCreate({
        inputValue: 'barfoo',
      });
      await cache.getItemOrCreate({
        inputValue: 'barfoo',
      });

      expect(checkValidity).not.toHaveBeenCalled();
      expect(create).toHaveBeenCalledTimes(3);
    });

    it('deletes items when map size exceeds given size limit', async () => {
      const create = vi.fn(async ({ inputValue }) => ({
        length: inputValue.length,
      }));
      const checkValidity = vi.fn(async () => true);

      const cache = createCacheSystem<
        { length: number },
        { inputValue: string },
        true
      >({
        async: true,
        getKeyFromInput: ({ inputValue }) => inputValue,
        create,
        checkValidity,
        sizeLimit: 4,
      });

      const foobarValue = await cache.getItemOrCreate({
        inputValue: 'foobar',
      });

      await cache.getItemOrCreate({
        inputValue: 'barfoo',
      });
      await cache.getItemOrCreate({
        inputValue: 'toto',
      });
      await cache.getItemOrCreate({
        inputValue: 'tata',
      });
      await cache.getItemOrCreate({
        inputValue: 'azerty',
      });

      const newFoobarValue = await cache.getItemOrCreate({
        inputValue: 'foobar',
      });

      expect(newFoobarValue).not.toBe(foobarValue);
      expect(create).toHaveBeenCalledTimes(6);
    });

    describe('in VSCode env', () => {
      const originalEnv = process.env;

      beforeEach(() => {
        vi.resetModules();
        process.env = {
          ...originalEnv,
          VSCODE_CWD: 'true',
        };
      });

      afterEach(() => {
        process.env = originalEnv;
      });

      it('creates new item on checkValidity failure', async () => {
        const create = vi.fn(async ({ inputValue }) => ({
          length: inputValue.length,
        }));
        const checkValidity = vi.fn(async () => false);

        const cache = createCacheSystem<
          { length: number },
          { inputValue: string },
          true
        >({
          async: true,
          getKeyFromInput: ({ inputValue }) => inputValue,
          create,
          checkValidity,
        });

        const firstValue = await cache.getItemOrCreate({
          inputValue: 'foobar',
        });
        const secondValue = await cache.getItemOrCreate({
          inputValue: 'foobar',
        });

        expect(firstValue).not.toBe(secondValue);
        expect(checkValidity).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledTimes(2);
      });

      it('gives existing item on checkValidity success', async () => {
        const create = vi.fn(async ({ inputValue }) => ({
          length: inputValue.length,
        }));
        const checkValidity = vi.fn(async () => true);

        const cache = createCacheSystem<
          { length: number },
          { inputValue: string },
          true
        >({
          async: true,
          getKeyFromInput: ({ inputValue }) => inputValue,
          create,
          checkValidity,
        });

        const firstValue = await cache.getItemOrCreate({
          inputValue: 'foobar',
        });
        const secondValue = await cache.getItemOrCreate({
          inputValue: 'foobar',
        });

        expect(firstValue).toBe(secondValue);
        expect(checkValidity).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledOnce();
      });

      it('gives existing item on checkValidity success, in sync mode', () => {
        const create = vi.fn(({ inputValue }) => ({
          length: inputValue.length,
        }));
        const checkValidity = vi.fn(() => true);

        const cache = createCacheSystem<
          { length: number },
          { inputValue: string },
          false
        >({
          async: false,
          getKeyFromInput: ({ inputValue }) => inputValue,
          create,
          checkValidity,
        });

        const firstValue = cache.getItemOrCreate({
          inputValue: 'foobar',
        });
        const secondValue = cache.getItemOrCreate({
          inputValue: 'foobar',
        });

        expect(firstValue).toBe(secondValue);
        expect(checkValidity).toHaveBeenCalledOnce();
        expect(create).toHaveBeenCalledOnce();
      });
    });

    describe('in CLI env', () => {
      it('gives existing item ignoring checkValidity', async () => {
        const create = vi.fn(async ({ inputValue }) => ({
          length: inputValue.length,
        }));
        const checkValidity = vi.fn(async () => false);

        const cache = createCacheSystem<
          { length: number },
          { inputValue: string },
          true
        >({
          async: true,
          getKeyFromInput: ({ inputValue }) => inputValue,
          create,
          checkValidity,
        });

        const firstValue = await cache.getItemOrCreate({
          inputValue: 'foobar',
        });
        const secondValue = await cache.getItemOrCreate({
          inputValue: 'foobar',
        });

        expect(firstValue).toBe(secondValue);
        expect(checkValidity).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledOnce();
      });

      it('gives existing item ignoring checkValidity, in sync mode', () => {
        const create = vi.fn(({ inputValue }) => ({
          length: inputValue.length,
        }));
        const checkValidity = vi.fn(() => false);

        const cache = createCacheSystem<
          { length: number },
          { inputValue: string },
          false
        >({
          async: false,
          getKeyFromInput: ({ inputValue }) => inputValue,
          create,
          checkValidity,
        });

        const firstValue = cache.getItemOrCreate({
          inputValue: 'foobar',
        });
        const secondValue = cache.getItemOrCreate({
          inputValue: 'foobar',
        });

        expect(firstValue).toBe(secondValue);
        expect(checkValidity).not.toHaveBeenCalled();
        expect(create).toHaveBeenCalledOnce();
      });
    });
  });
});

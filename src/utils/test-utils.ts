import { format } from 'prettier';
import ts from 'typescript/lib/tsserverlibrary';
import { Logger } from './logger';

export const createFakeLogger = (): Logger => ({
  log: vi.fn(),
  error: vi.fn(),
  verbose: vi.fn(),
  debug: vi.fn(),
  debugTime: vi.fn(),
  debugToFile: vi.fn(),
  setFilename: vi.fn(),
});

export const createSourceFile = (code: string) =>
  ts.createSourceFile('foo.tsx', code, ts.ScriptTarget.ESNext);

export const formatTS = (str: string) =>
  format(str, {
    parser: 'babel-ts',
  });

export const formatGQL = (str: string) => format(str, { parser: 'graphql' });

export const formatSpaces = (str: string) => str.replaceAll(/\s/g, '');

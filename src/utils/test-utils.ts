import { format } from 'prettier';
import ts from 'typescript/lib/tsserverlibrary';

export const createSourceFile = (code: string) =>
  ts.createSourceFile('foo.tsx', code, ts.ScriptTarget.ESNext);

export const formatTS = (str: string) =>
  format(str, {
    parser: 'babel-ts',
  });

export const formatGQL = (str: string) => format(str, { parser: 'graphql' });

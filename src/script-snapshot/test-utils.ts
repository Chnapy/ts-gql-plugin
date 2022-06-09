import { format } from 'prettier';

export const formatTS = (str: string) =>
  format(str, {
    parser: 'babel-ts',
  });

export const formatGQL = (str: string) => format(str, { parser: 'graphql' });

// @ts-gql Catalog
// @ts-gql Profile

import { UnionToArray } from 'ts-gql-plugin';

export const provider: TsGql.CatalogOAuthProvider = 'FACEBOOK';

export const providerList: UnionToArray<TsGql.CatalogOAuthProvider> = [
  'GOOGLE',
  'FACEBOOK',
];

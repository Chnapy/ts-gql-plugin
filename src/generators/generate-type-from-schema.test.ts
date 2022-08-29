import { parse } from 'graphql';
import { formatTS } from '../utils/test-utils';
import { generateTypeFromSchema } from './generate-type-from-schema';

describe('Generate type from schema', () => {
  it('generates type from correct string', async () => {
    const schema = parse(`
    type User {
      id: ID!
      oauthId: String!
      email: String!
      name: String!
      picture: String
    }
    
    type Query {
      users: [User!]!
      user(id: ID!): User!
    }
    `);

    const expected = [
      'export type Maybe<T> = T | null;',
      'export type InputMaybe<T> = Maybe<T>;',
      'export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };',
      'export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };',
      'export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };',
      `
      /** All built-in and custom scalars, mapped to their actual values */
      export interface Scalars {
        ID: string;
        String: string;
        Boolean: boolean;
        Int: number;
        Float: number;
      };
      
      export interface CatalogUser {
        __typename?: 'User';
        id: Scalars['ID'];
        oauthId: Scalars['String'];
        email: Scalars['String'];
        name: Scalars['String'];
        picture?: Maybe<Scalars['String']>;
      };
      
      export interface CatalogQuery {
        __typename?: 'Query';
        users: Array<CatalogUser>;
        user: CatalogUser;
      };
      
      export interface CatalogQueryUserArgs {
        id: Scalars['ID'];
      };
    `,
    ];

    const result = await generateTypeFromSchema(schema, 'Catalog');

    expect(result.map(formatTS)).toEqual(expected.map(formatTS));
  });
});

import { parse } from 'graphql';
import { formatTS } from './test-utils';
import { extractTypeFromSchema } from './extract-type-from-schema';

describe('Extract type from schema', () => {
  it('extracts type from correct string', async () => {
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

    const expected = `
      type Maybe<T> = T | null;
      type InputMaybe<T> = Maybe<T>;
      type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
      type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
      type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
      /** All built-in and custom scalars, mapped to their actual values */
      type Scalars = {
        ID: string;
        String: string;
        Boolean: boolean;
        Int: number;
        Float: number;
      };
      
      type User = {
        __typename?: 'User';
        id: Scalars['ID'];
        oauthId: Scalars['String'];
        email: Scalars['String'];
        name: Scalars['String'];
        picture?: Maybe<Scalars['String']>;
      };
      
      type Query = {
        __typename?: 'Query';
        users: Array<User>;
        user: User;
      };
      
      
      type QueryUserArgs = {
        id: Scalars['ID'];
      };
    `;

    const result = await extractTypeFromSchema(schema);

    expect(formatTS(result)).toEqual(formatTS(expected));
  });
});

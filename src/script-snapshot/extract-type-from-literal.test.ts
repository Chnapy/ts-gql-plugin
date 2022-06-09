import { parse } from 'graphql';
import { extractTypeFromLiteral } from './extract-type-from-literal';
import { formatGQL, formatTS } from './test-utils';

describe('Extract type from literal', () => {
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

    const code = `
    query User($id: ID!) {
      user(id: $id) {
        id
        name
      }
      users {
        id
        email
      }
    }
`;

    const expectedVariables = `UserQueryVariables`;

    const expectedResult = `UserQueryOperation`;

    const expectedStaticTypes = formatTS(`
      type UserQueryVariables = Exact<{
        id: Scalars['ID'];
      }>;

      type UserQueryOperation = { __typename?: 'Query', user: { __typename?: 'User', id: string, name: string }, users: Array<{ __typename?: 'User', id: string, email: string }> };
    `);

    const result = await extractTypeFromLiteral(code, schema);

    expect(formatGQL(result.literal)).toEqual(formatGQL(code));
    expect(result.variables).toEqual(expectedVariables);
    expect(result.result).toEqual(expectedResult);
    expect(formatTS(result.staticTypes)).toEqual(expectedStaticTypes);
  });
});

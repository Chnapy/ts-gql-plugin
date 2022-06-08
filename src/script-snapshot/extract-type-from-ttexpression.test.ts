import { parse } from 'graphql';
import { extractTypeFromTTExpression } from './extract-type-from-ttexpression';
import { formatTS } from './test-utils';

describe('Extract type from TTExpression', () => {
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

    const code = `gql\`
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
\``;

    const expectedVariables = `UserQueryVariables`;

    const expectedOperation = `UserQueryOperation`;

    const expectedStatic = formatTS(`
      type UserQueryVariables = Exact<{
        id: Scalars['ID'];
      }>;

      type UserQueryOperation = { __typename?: 'Query', user: { __typename?: 'User', id: string, name: string }, users: Array<{ __typename?: 'User', id: string, email: string }> };
    `);

    const result = await extractTypeFromTTExpression(code, schema);

    expect(formatTS(result.staticType)).toEqual(expectedStatic);
    expect(result.variableType).toEqual(
      `TypedDocumentNode<${expectedOperation}, ${expectedVariables}>`
    );
  });
});

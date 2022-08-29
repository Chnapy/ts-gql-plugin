import { parse } from 'graphql';
import { generateTypeFromLiteral } from './generate-type-from-literal';
import { formatSpaces } from '../utils/test-utils';

describe('Generate type from literal', () => {
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

    const expectedVariableType = `Exact<{
      id: Scalars['ID'];
    }>`;

    const expectedOperationType = `{ __typename?: 'Query', user: { __typename?: 'User', id: string, name: string }, users: Array<{ __typename?: 'User', id: string, email: string }> }`;

    const result = await generateTypeFromLiteral(code, schema);

    expect(formatSpaces(result.variablesType)).toEqual(
      formatSpaces(expectedVariableType)
    );
    expect(formatSpaces(result.operationType)).toEqual(
      formatSpaces(expectedOperationType)
    );
  });
});

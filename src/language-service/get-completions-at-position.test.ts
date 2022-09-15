import ts from 'typescript/lib/tsserverlibrary';
import { createCachedGraphQLConfigLoader } from '../cached/cached-graphql-config-loader';
import { createCachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { createFakeLogger } from '../utils/test-utils';
import { createGetCompletionsAtPosition } from './get-completions-at-position';

describe('Get completions at position', () => {
  const multiProjectConfigPath =
    '/workspace/src/test-files/multi-project/.graphqlrc';

  const projectNameRegex = '([A-Z][a-z]*)';

  it('gives completions', async () => {
    const logger = createFakeLogger();
    const errorCatcher = vi.fn(() => null);

    const cachedGraphQLConfigLoader = createCachedGraphQLConfigLoader({
      directory: '',
      graphqlConfigPath: multiProjectConfigPath,
      projectNameRegex,
      logger,
    });

    const cachedGraphQLSchemaLoader = createCachedGraphQLSchemaLoader({
      cachedGraphQLConfigLoader,
      errorCatcher,
    });

    const code = `
import { useQuery } from '@apollo/client';
import { gql } from 'graphql-tag';

const { data } = useQuery(
    gql(\`
    query CatalogUser1($id: ID!) {
    user(id: $id) {
        id
        name
    }
    users {
        id
    }
    }
\`)
);

console.log(data);        
`;

    const getCompletionsAtPosition = createGetCompletionsAtPosition(
      () => undefined,
      {
        getProgram: () =>
          ({
            getSourceFile: () => ts.createSourceFile('foo.ts', code, 99),
          } as unknown as ts.Program),
      },
      cachedGraphQLSchemaLoader,
      { projectNameRegex }
    );

    expect(await getCompletionsAtPosition('foo.ts', 198, undefined)).toEqual({
      entries: [
        {
          kind: '5',
          kindModifiers: 'declare',
          name: 'id',
          sortText: '0',
        },
        {
          kind: '5',
          kindModifiers: 'declare',
          name: 'oauthId',
          sortText: '0',
        },
        {
          kind: '5',
          kindModifiers: 'declare',
          name: 'email',
          sortText: '0',
        },
        {
          kind: '5',
          kindModifiers: 'declare',
          name: 'name',
          sortText: '0',
        },
        {
          kind: '5',
          kindModifiers: 'declare',
          name: 'picture',
          sortText: '0',
        },
        {
          kind: '5',
          kindModifiers: 'declare',
          name: 'provider',
          sortText: '0',
        },
        {
          kind: '5',
          kindModifiers: 'declare',
          name: '__typename',
          sortText: '0',
        },
      ],
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
    });
  });
});

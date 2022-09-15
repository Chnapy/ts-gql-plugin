import ts from 'typescript/lib/tsserverlibrary';
import { createCachedGraphQLConfigLoader } from '../cached/cached-graphql-config-loader';
import { createCachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { createFakeLogger } from '../utils/test-utils';
import { createGetQuickInfoAtPosition } from './get-quick-info-at-position';

describe('Get quick info at position', () => {
  const multiProjectConfigPath =
    '/workspace/src/test-files/multi-project/.graphqlrc';

  const projectNameRegex = '([A-Z][a-z]*)';

  it('gives query infos on hover', async () => {
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

    const getQuickInfoAtPosition = createGetQuickInfoAtPosition(
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

    expect(await getQuickInfoAtPosition('foo.ts', 157)).toEqual({
      displayParts: [
        {
          kind: '',
          text: 'Query.user: User!',
        },
      ],
      kind: 'string',
      kindModifiers: '',
      textSpan: {
        length: 4,
        start: 156,
      },
    });
  });
});

import ts from 'typescript/lib/tsserverlibrary';
import { createCachedGraphQLConfigLoader } from '../cached/cached-graphql-config-loader';
import { createCachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { createCachedDocumentSchemaLoader } from '../cached/cached-document-schema-loader';
import { createFakeLogger } from '../utils/test-utils';
import { createGetDefinitionAndBoundSpan } from './get-definition-and-bound-span';

describe('Get definitions and bound span', () => {
  const multiProjectConfigPath = 'src/test-files/multi-project/.graphqlrc';

  const projectNameRegex = '([A-Z][a-z]*)';

  it('gives schema definition', async () => {
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

    const cachedDocumentSchemaLoader = createCachedDocumentSchemaLoader({
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

    const getDefinitionAndBoundSpan = createGetDefinitionAndBoundSpan(
      () => undefined,
      {
        getProgram: () =>
          ({
            getSourceFile: () => ts.createSourceFile('foo.ts', code, 99),
          } as unknown as ts.Program),
      },
      cachedDocumentSchemaLoader,
      cachedGraphQLSchemaLoader,
      { projectNameRegex }
    );

    expect(await getDefinitionAndBoundSpan('foo.ts', 157)).toEqual({
      textSpan: {
        start: 156,
        length: 4,
      },
      definitions: [
        {
          fileName: expect.stringContaining(
            'src/test-files/multi-project/catalog-schema.graphql'
          ),
          textSpan: {
            start: 149,
            length: 20,
          },
          kind: ts.ScriptElementKind.unknown,
          name: '',
          containerName: expect.stringContaining(
            'src/test-files/multi-project/catalog-schema.graphql'
          ),
          containerKind: ts.ScriptElementKind.unknown,
        },
      ],
    });
  });
});

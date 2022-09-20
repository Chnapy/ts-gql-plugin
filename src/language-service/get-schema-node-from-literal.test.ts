import {
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  Kind,
  ObjectTypeDefinitionNode,
} from 'graphql';
import { createCachedDocumentSchemaLoader } from '../cached/cached-document-schema-loader';
import { createCachedGraphQLConfigLoader } from '../cached/cached-graphql-config-loader';
import { CursorPosition } from '../utils/cursor-position';
import { createFakeLogger } from '../utils/test-utils';
import { getSchemaNodeFromLiteral } from './get-schema-node-from-literal';

describe('Get schema node from literal', () => {
  const multiProjectConfigPath =
    'src/test-files/multi-project-complex/.graphqlrc';

  const projectNameRegex = '([A-Z][a-z]*)';

  const getSchemaLoader = () => {
    const logger = createFakeLogger();
    const errorCatcher = vi.fn(() => null);

    const cachedGraphQLConfigLoader = createCachedGraphQLConfigLoader({
      directory: '',
      graphqlConfigPath: multiProjectConfigPath,
      projectNameRegex,
      logger,
    });

    return createCachedDocumentSchemaLoader({
      cachedGraphQLConfigLoader,
      errorCatcher,
    });
  };

  it('gives field definition', async () => {
    const code = `
    query CatalogUser1($id: ID!) {
    user(id: $id) {
        id
        name
    }
    users {
        id
    }
    }
`;

    const result = await getSchemaNodeFromLiteral(
      code,
      new CursorPosition(4, 10),
      getSchemaLoader(),
      { projectNameRegex }
    );

    expect(result).toEqual<FieldDefinitionNode>({
      kind: Kind.FIELD_DEFINITION,
      name: {
        kind: Kind.NAME,
        value: 'name',
        loc: expect.objectContaining({
          start: 92,
          end: 96,
        }),
      },
      description: undefined,
      arguments: [],
      type: expect.anything(),
      directives: [],
      loc: expect.objectContaining({
        start: 92,
        end: 105,
      }),
    });
  });

  it('gives operation definition', async () => {
    const code = `
    query CatalogUser1($id: ID!) {
    user(id: $id) {
        id
        name
    }
    users {
        id
    }
    }
`;

    const result = await getSchemaNodeFromLiteral(
      code,
      new CursorPosition(2, 6),
      getSchemaLoader(),
      { projectNameRegex }
    );

    expect(result).toEqual<ObjectTypeDefinitionNode>({
      kind: Kind.OBJECT_TYPE_DEFINITION,
      name: {
        kind: Kind.NAME,
        value: 'User',
        loc: expect.objectContaining({
          start: 5,
          end: 9,
        }),
      },
      description: undefined,
      directives: [],
      fields: expect.any(Array),
      interfaces: expect.any(Array),
      loc: expect.objectContaining({
        start: 0,
        end: 125,
      }),
    });
  });

  it('gives input type definition', async () => {
    const code = `
    mutation CatalogUser1($input: UpdateUserInput) {
      updateUser(updateUserInput: $input) {
          id
      }
  }  
`;

    const result = await getSchemaNodeFromLiteral(
      code,
      new CursorPosition(1, 40),
      getSchemaLoader(),
      { projectNameRegex }
    );

    expect(result).toEqual<InputObjectTypeDefinitionNode>({
      kind: Kind.INPUT_OBJECT_TYPE_DEFINITION,
      name: {
        kind: Kind.NAME,
        value: 'UpdateUserInput',
        loc: expect.objectContaining({
          start: 630,
          end: 645,
        }),
      },
      description: undefined,
      directives: [],
      fields: expect.any(Array),
      loc: expect.objectContaining({
        start: 624,
        end: 694,
      }),
    });
  });
});

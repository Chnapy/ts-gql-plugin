import { Kind, NamedTypeNode, parse } from 'graphql';
import {
  getDefinitionQueryResultForDefinitionNode,
  getDefinitionQueryResultForNamedType,
} from 'graphql-language-service';
import { getASTNodeAtPosition } from 'graphql-language-service-utils';
import { LanguageServiceWithDiagnostics } from 'tsc-ls';
import ts from 'typescript/lib/tsserverlibrary';
import { CachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { PluginConfig } from '../plugin-config';
import { getCurrentWordRange } from '../utils/get-current-word-range';
import { PromisifyFunction } from './create-language-service-proxy';
import { getQuickInfosPayload } from './get-quick-info-at-position';

export const createGetDefinitionAndBoundSpan =
  (
    initialFn: LanguageServiceWithDiagnostics['getDefinitionAndBoundSpan'],
    languageService: Pick<LanguageServiceWithDiagnostics, 'getProgram'>,
    cachedGraphQLSchemaLoader: CachedGraphQLSchemaLoader,
    { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>
  ): PromisifyFunction<
    LanguageServiceWithDiagnostics['getDefinitionAndBoundSpan']
  > =>
  async (fileName, position) => {
    const payload = await getQuickInfosPayload(
      languageService,
      cachedGraphQLSchemaLoader,
      { projectNameRegex },
      fileName,
      position
    );

    if (!payload) {
      return initialFn(fileName, position);
    }

    const ast = parse(payload.targetLiteral);

    const node = getASTNodeAtPosition(
      payload.targetLiteral,
      ast,
      payload.cursor
    );

    if (!node) {
      return initialFn(fileName, position);
    }

    const getDefinitionQueryResult = async () => {
      if (node.kind === Kind.FIELD || node.kind === Kind.NAMED_TYPE) {
        return await getDefinitionQueryResultForNamedType(
          payload.targetLiteral,
          node as NamedTypeNode,
          [
            {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              definition: node as any,
              content: payload.targetLiteral,
              filePath: fileName,
            },
          ]
        );
      }

      if (
        node.kind === Kind.OPERATION_DEFINITION ||
        node.kind === Kind.FRAGMENT_DEFINITION
      ) {
        return await getDefinitionQueryResultForDefinitionNode(
          fileName,
          payload.targetLiteral,
          node
        );
      }

      return null;
    };

    const result = await getDefinitionQueryResult();

    const def = result?.definitions[0];
    if (!def) {
      return initialFn(fileName, position);
    }

    const [start, end] = getCurrentWordRange(payload.sourceFile.text, position);

    return {
      textSpan: {
        start,
        length: end - start + 1,
      },
      definitions: [
        {
          fileName: payload.schemaFilePath!,
          textSpan: {
            start: 0,
            length: 0,
          },
          kind: ts.ScriptElementKind.unknown,
          name: def.name ?? '',
          containerName: payload.schemaFilePath!,
          containerKind: ts.ScriptElementKind.unknown,
        },
      ],
    };
  };

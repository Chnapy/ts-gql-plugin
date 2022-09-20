import { parse } from 'graphql';
import { getASTNodeAtPosition } from 'graphql-language-service-utils';
import { LanguageServiceWithDiagnostics } from 'tsc-ls';
import ts from 'typescript/lib/tsserverlibrary';
import { CachedDocumentSchemaLoader } from '../cached/cached-document-schema-loader';
import { CachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { PluginConfig } from '../plugin-config';
import { getCurrentWordRange } from '../utils/get-current-word-range';
import { PromisifyFunction } from './create-language-service-proxy';
import { getQuickInfosPayload } from './get-quick-info-at-position';
import { getSchemaNodeFromLiteral } from './get-schema-node-from-literal';

export const createGetDefinitionAndBoundSpan =
  (
    initialFn: LanguageServiceWithDiagnostics['getDefinitionAndBoundSpan'],
    languageService: Pick<LanguageServiceWithDiagnostics, 'getProgram'>,
    cachedDocumentSchemaLoader: CachedDocumentSchemaLoader,
    cachedGraphQLSchemaLoader: CachedGraphQLSchemaLoader,
    { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>
  ): PromisifyFunction<
    LanguageServiceWithDiagnostics['getDefinitionAndBoundSpan']
  > =>
  async (fileName, position) => {
    const defaultAct = () => initialFn(fileName, position);

    const payload = await getQuickInfosPayload(
      languageService,
      cachedGraphQLSchemaLoader,
      { projectNameRegex },
      fileName,
      position
    );

    if (!payload) {
      return defaultAct();
    }

    const ast = parse(payload.targetLiteral);

    const node = getASTNodeAtPosition(
      payload.targetLiteral,
      ast,
      payload.cursor
    );

    if (!node) {
      return defaultAct();
    }

    const targetNode = await getSchemaNodeFromLiteral(
      payload.targetLiteral,
      payload.cursor,
      cachedDocumentSchemaLoader,
      { projectNameRegex }
    );

    if (!targetNode) {
      return defaultAct();
    }

    const [start, end] = getCurrentWordRange(payload.sourceFile.text, position);

    const loc = targetNode.loc;
    const textSpan: ts.TextSpan = loc
      ? {
          start: loc.start,
          length: loc.end - loc.start,
        }
      : {
          start: 0,
          length: 0,
        };

    return {
      textSpan: {
        start,
        length: end - start + 1,
      },
      definitions: [
        {
          fileName: payload.schemaFilePath!,
          textSpan,
          kind: ts.ScriptElementKind.unknown,
          name: '',
          containerName: payload.schemaFilePath!,
          containerKind: ts.ScriptElementKind.unknown,
        },
      ],
    };
  };

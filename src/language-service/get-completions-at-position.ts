import { getAutocompleteSuggestions } from 'graphql-language-service';
import { LanguageServiceWithDiagnostics } from 'tsc-ls';
import ts from 'typescript';
import { CachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { PluginConfig } from '../plugin-config';
import { PromisifyFunction } from './create-language-service-proxy';
import { getQuickInfosPayload } from './get-quick-info-at-position';

export const createGetCompletionsAtPosition =
  (
    initialFn: LanguageServiceWithDiagnostics['getCompletionsAtPosition'],
    languageService: Pick<LanguageServiceWithDiagnostics, 'getProgram'>,
    cachedGraphQLSchemaLoader: CachedGraphQLSchemaLoader,
    { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>
  ): PromisifyFunction<
    LanguageServiceWithDiagnostics['getCompletionsAtPosition']
  > =>
  async (fileName: string, position: number, ...rest) => {
    const payload = await getQuickInfosPayload(
      languageService,
      cachedGraphQLSchemaLoader,
      { projectNameRegex },
      fileName,
      position
    );

    if (!payload) {
      return initialFn(fileName, position, ...rest);
    }

    const result = getAutocompleteSuggestions(
      payload.schemaDocument,
      payload.targetLiteral,
      payload.cursor
    );

    return {
      isGlobalCompletion: false,
      isMemberCompletion: false,
      isNewIdentifierLocation: false,
      entries: result.map((item): ts.CompletionEntry => {
        const kind = (
          item.kind ? `${item.kind}` : 'unknown'
        ) as ts.ScriptElementKind;

        return {
          name: item.label,
          kindModifiers: 'declare',
          kind,
          sortText: '0',
        };
      }),
    };
  };

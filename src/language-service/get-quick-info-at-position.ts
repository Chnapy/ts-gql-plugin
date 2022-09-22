import { getHoverInformation } from 'graphql-language-service';
import { LanguageServiceWithDiagnostics } from 'tsc-ls';
import ts from 'typescript/lib/tsserverlibrary';
import { CachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { getProjectNameFromLiteral } from '../cached/cached-literal-parser';
import { PluginConfig } from '../plugin-config';
import { parseLiteralOccurenceList } from '../source-update/parse-literal-occurence-list';
import { CursorPosition } from '../utils/cursor-position';
import { getCurrentWordRange } from '../utils/get-current-word-range';
import { PromisifyFunction } from './create-language-service-proxy';

export const getQuickInfosPayload = async (
  languageService: Pick<LanguageServiceWithDiagnostics, 'getProgram'>,
  cachedGraphQLSchemaLoader: CachedGraphQLSchemaLoader,
  { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>,
  fileName: string,
  position: number
) => {
  const program = languageService.getProgram();
  const sourceFile = program?.getSourceFile(fileName);
  if (!sourceFile) {
    return null;
  }

  const occurences = parseLiteralOccurenceList(sourceFile);

  const target = occurences.find(({ locationOffset, body }) => {
    if (locationOffset.index === undefined) {
      return false;
    }

    const start = locationOffset.index;
    const end = start + body.length;

    return position >= start && position <= end;
  });
  if (!target) {
    return null;
  }

  const targetLiteral = target.body;

  const projectName = getProjectNameFromLiteral(
    targetLiteral,
    projectNameRegex
  );

  const schemaInfos = await cachedGraphQLSchemaLoader.getItemOrCreate({
    projectName,
  });

  if (!schemaInfos) {
    return null;
  }

  const literalPosition = position - target.locationOffset.index! - 1;
  const lines = targetLiteral.slice(0, literalPosition + 1).split('\n');
  const currentLine = lines[lines.length - 1];

  const character = currentLine.length;
  const line = lines.length - 1;

  const cursor = new CursorPosition(line, character);

  return {
    ...schemaInfos,
    sourceFile,
    targetLiteral,
    cursor,
  };
};

export const createGetQuickInfoAtPosition =
  (
    initialFn: LanguageServiceWithDiagnostics['getQuickInfoAtPosition'],
    languageService: Pick<LanguageServiceWithDiagnostics, 'getProgram'>,
    cachedGraphQLSchemaLoader: CachedGraphQLSchemaLoader,
    { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>
  ): PromisifyFunction<
    LanguageServiceWithDiagnostics['getQuickInfoAtPosition']
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

    const result = getHoverInformation(
      payload.schemaDocument,
      payload.targetLiteral,
      payload.cursor
    );

    if (!result || typeof result !== 'string') {
      return defaultAct();
    }

    const wordRange = getCurrentWordRange(payload.sourceFile.text, position);

    return {
      kind: ts.ScriptElementKind.string,
      textSpan: {
        start: wordRange[0],
        length: wordRange[1] - wordRange[0] + 1,
      },
      kindModifiers: '',
      displayParts: [{ text: result, kind: '' }],
    };
  };

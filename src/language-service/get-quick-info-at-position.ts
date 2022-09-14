import { getHoverInformation } from 'graphql-language-service-interface';
import { LanguageServiceWithDiagnostics } from 'tsc-ls';
import ts from 'typescript/lib/tsserverlibrary';
import { CachedGraphQLSchemaLoader } from '../cached/cached-graphql-schema-loader';
import { getProjectNameFromLiteral } from '../cached/cached-literal-parser';
import { PluginConfig } from '../plugin-config';
import { parseLiteralOccurenceList } from '../source-update/parse-literal-occurence-list';
import { CursorPosition } from '../utils/cursor-position';
import { getCurrentWordRange } from '../utils/get-current-word-range';
import { waitPromiseSync } from '../utils/wait-promise-sync';

export const createGetQuickInfoAtPosition =
  (
    initialFn: LanguageServiceWithDiagnostics['getQuickInfoAtPosition'],
    languageService: LanguageServiceWithDiagnostics,
    cachedGraphQLSchemaLoader: CachedGraphQLSchemaLoader,
    { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>
  ): LanguageServiceWithDiagnostics['getQuickInfoAtPosition'] =>
  (fileName, position) => {
    const defaultAct = () => initialFn(fileName, position);

    const program = languageService.getProgram();
    const sourceFile = program?.getSourceFile(fileName);
    if (!sourceFile) {
      return defaultAct();
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
      return defaultAct();
    }

    const targetLiteral = target.body;

    const projectName = getProjectNameFromLiteral(
      targetLiteral,
      projectNameRegex
    );

    const schemaInfos = waitPromiseSync(
      cachedGraphQLSchemaLoader.getItemOrCreate({
        projectName,
      })
    );

    if (!schemaInfos) {
      return defaultAct();
    }

    const literalPosition = position - target.locationOffset.index! - 1;
    const lines = targetLiteral.slice(0, literalPosition + 1).split('\n');
    const currentLine = lines[lines.length - 1];

    const character = currentLine.length;
    const line = lines.length - 1;

    const cursor = new CursorPosition(line, character);

    const result = getHoverInformation(
      schemaInfos.schemaDocument,
      targetLiteral,
      cursor
    );

    if (!result || typeof result !== 'string') {
      return defaultAct();
    }

    const wordRange = getCurrentWordRange(sourceFile.text, position);

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

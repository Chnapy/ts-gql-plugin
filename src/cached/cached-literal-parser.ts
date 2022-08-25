import ts from 'typescript/lib/tsserverlibrary';
import { ErrorCatcher } from '../create-error-catcher';
import { generateTypeFromLiteral } from '../generators/generate-type-from-literal';
import { DocumentInfos } from '../generators/generate-bottom-content';
import { createCacheSystem } from '../utils/cache-system';
import { CachedSchemaLoader, defaultProjectName } from './cached-schema-loader';

type CreateCachedLiteralParserOptions = {
  cachedSchemaLoader: CachedSchemaLoader;
  projectNameRegex: string | undefined;
  errorCatcher: ErrorCatcher;
};

export type CachedLiteralParserValue<D extends DocumentInfos = DocumentInfos> =
  {
    documentInfos: D;
    staticGlobals: string;
  } | null;

type CachedLiteralParserInput = {
  literal: string;
  sourceFile: ts.SourceFile;
};

export type CachedLiteralParser = ReturnType<typeof createCachedLiteralParser>;

export const createCachedLiteralParser = ({
  cachedSchemaLoader,
  projectNameRegex,
  errorCatcher,
}: CreateCachedLiteralParserOptions) => {
  const getProjectNameFromLiteral = (literal: string) =>
    projectNameRegex
      ? (new RegExp(projectNameRegex).exec(literal) ?? [])[0]
      : defaultProjectName;

  const getProjectFromLiteral = async (literal: string) => {
    const projectName = getProjectNameFromLiteral(literal);

    const project = await cachedSchemaLoader.getItemOrCreate({
      projectName,
    });
    if (!project) {
      throw new Error(`Project not defined for name "${projectName}"`);
    }

    return project;
  };

  const parser = createCacheSystem<
    CachedLiteralParserValue,
    CachedLiteralParserInput
  >({
    getKeyFromInput: (input) => input.literal.replaceAll(/\s/gi, ''),
    create: async ({ literal, sourceFile }) => {
      try {
        const project = await getProjectFromLiteral(literal);

        return {
          documentInfos: await generateTypeFromLiteral(
            literal,
            project.schemaDocument,
            project.extension.codegenConfig
          ),
          staticGlobals: project.staticGlobals,
        };
      } catch (error) {
        errorCatcher(
          error,
          sourceFile,
          sourceFile.text.indexOf(literal),
          literal.length
        );
        return null;
      }
    },
    checkValidity: async ({ input }) => {
      const projectName = getProjectNameFromLiteral(input.literal);

      return await cachedSchemaLoader.checkItemValidity({
        projectName,
      });
    },
  });

  return parser;
};

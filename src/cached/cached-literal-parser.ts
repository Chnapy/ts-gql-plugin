import ts from 'typescript/lib/tsserverlibrary';
import { ErrorCatcher } from '../create-error-catcher';
import { generateTypeFromLiteral } from '../generators/generate-type-from-literal';
import { DocumentInfos } from '../generators/generate-bottom-content';
import { createCacheSystem } from '../utils/cache-system';
import {
  CachedDocumentSchemaLoader,
  defaultProjectName,
  getProjectNameIfNotDefault,
} from './cached-document-schema-loader';

type CreateCachedLiteralParserOptions = {
  cachedDocumentSchemaLoader: CachedDocumentSchemaLoader;
  projectNameRegex: string | undefined;
  errorCatcher: ErrorCatcher;
};

export type CachedLiteralParserValue<D extends DocumentInfos = DocumentInfos> =
  {
    documentInfos: D;
    staticGlobals: string[];
  } | null;

type CachedLiteralParserInput = {
  literal: string;
  sourceFile: ts.SourceFile;
};

export type CachedLiteralParser = ReturnType<typeof createCachedLiteralParser>;

export const getProjectNameFromLiteral = (
  literal: string,
  projectNameRegex: string | undefined
) =>
  projectNameRegex
    ? (new RegExp(projectNameRegex).exec(literal) ?? [])[0]!
    : defaultProjectName;

export const createCachedLiteralParser = ({
  cachedDocumentSchemaLoader,
  projectNameRegex,
  errorCatcher,
}: CreateCachedLiteralParserOptions) => {
  const getProjectFromLiteral = async (literal: string) => {
    const projectName = getProjectNameFromLiteral(literal, projectNameRegex);

    const project = await cachedDocumentSchemaLoader.getItemOrCreate({
      projectName,
    });
    if (!project) {
      throw new Error(
        `Project not defined for name "${projectName}", or there is an issue on schema file`
      );
    }

    return { ...project, projectName };
  };

  const parser = createCacheSystem<
    CachedLiteralParserValue,
    CachedLiteralParserInput,
    true
  >({
    async: true,
    getKeyFromInput: (input) => input.literal.replaceAll(/\s/gi, ''),
    create: async ({ literal, sourceFile }) => {
      try {
        const project = await getProjectFromLiteral(literal);

        return {
          documentInfos: await generateTypeFromLiteral(
            literal,
            project.schemaDocument,
            getProjectNameIfNotDefault(project.projectName),
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
      const projectName = getProjectNameFromLiteral(
        input.literal,
        projectNameRegex
      );

      return await cachedDocumentSchemaLoader.checkItemValidity({
        projectName,
      });
    },
  });

  return parser;
};

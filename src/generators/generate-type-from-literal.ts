import { codegen } from '@graphql-codegen/core';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import { DocumentNode, GraphQLError, parse } from 'graphql';
import { DocumentInfos } from './generate-bottom-content';

type CodegenPlugin = (typeof plugins)[number];
const plugins = [typescriptOperationsPlugin];

export const generateTypeFromLiteral = async (
  literal: string,
  schema: DocumentNode,
  projectName?: string,
  codegenConfig: typescriptOperationsPlugin.TypeScriptDocumentsPluginConfig = {}
): Promise<DocumentInfos> => {
  const document = parse(literal);

  const pluginMap = plugins.reduce<Record<number, CodegenPlugin>>(
    (map, plugin, i) => {
      map[i + 1] = plugin;
      return map;
    },
    {}
  );

  const config: typescriptOperationsPlugin.TypeScriptDocumentsPluginConfig = {
    typesPrefix: projectName,
    ...codegenConfig,
  };

  const codegenErrors: GraphQLError[] = [];

  const staticTypes = await codegen({
    schema,
    documents: [
      {
        location: '',
        document,
      },
    ],
    filename: 'foo.ts',
    config,
    plugins: plugins.map((_plugin, i) => ({
      [i + 1]: {},
    })),
    pluginMap,
    profiler: {
      collect: () => [],
      run: async (fn) => {
        const value = await fn();

        if (Array.isArray(value)) {
          codegenErrors.push(...value.flatMap((val) => val.errors ?? []));
        }

        return value;
      },
    },
  }).catch(async (error) => {
    if (codegenErrors.length === 0) {
      throw error;
    }

    throw new AggregateError(codegenErrors, 'Codegen errors');
  });

  const typeRegex = /\s=\s(.*?);\n$/gms;

  const variablesType = typeRegex.exec(staticTypes)?.[1];
  if (!variablesType) {
    throw new Error(`Variables type not found by regex: ${staticTypes}`);
  }

  const operationType = typeRegex.exec(staticTypes)?.[1];
  if (!operationType) {
    throw new Error(`Operation type not found by regex: ${staticTypes}`);
  }

  return {
    variablesType,
    operationType,
  };
};

import { codegen } from '@graphql-codegen/core';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import { DocumentNode, parse } from 'graphql';
import { DocumentInfos } from './generate-bottom-content';

type CodegenPlugin = typeof plugins[number];
const plugins = [typescriptOperationsPlugin];

export const generateTypeFromLiteral = async (
  literal: string,
  schema: DocumentNode,
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
    ...codegenConfig,
  };

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

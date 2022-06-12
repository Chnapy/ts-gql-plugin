import { codegen } from '@graphql-codegen/core';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import { DocumentNode, parse } from 'graphql';
import { DocumentInfos } from './generate-bottom-content';

const variablesRegex = /type (\w+Variables) = /s;
const operationsRegex = /type (\w+Operation) = /s;

type CodegenPlugin = typeof plugins[number];
const plugins = [typescriptOperationsPlugin];

export const extractTypeFromLiteral = async (
  literal: string,
  schema: DocumentNode
): Promise<DocumentInfos> => {
  const document = parse(literal);

  const pluginMap = plugins.reduce<Record<number, CodegenPlugin>>(
    (map, plugin, i) => {
      map[i + 1] = plugin;
      return map;
    },
    {}
  );

  const config = {
    noExport: true,
    operationResultSuffix: 'Operation',
    // typesPrefix: 'I',
    // globalNamespace: true,
    // preResolveTypes: false,
    // mergeFragmentTypes: true,
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

  const variables = variablesRegex.exec(staticTypes)?.[1];
  if (!variables) {
    throw new Error(`Variables type name not found by regex: ${staticTypes}`);
  }

  const result = operationsRegex.exec(staticTypes)?.[1];
  if (!result) {
    throw new Error(`Operation type name not found by regex: ${staticTypes}`);
  }

  return {
    literal,
    variables,
    result,
    staticTypes,
  };
};

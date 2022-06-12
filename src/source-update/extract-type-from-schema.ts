import { codegen } from '@graphql-codegen/core';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import { DocumentNode } from 'graphql';

type CodegenPlugin = typeof plugins[number];
const plugins = [typescriptPlugin];

export const extractTypeFromSchema = async (
  schema: DocumentNode
): Promise<string> => {
  const pluginMap = plugins.reduce<Record<number, CodegenPlugin>>(
    (map, plugin, i) => {
      map[i + 1] = plugin;
      return map;
    },
    {}
  );

  const config = {
    noExport: true,
    // operationResultSuffix: 'Operation',
    // typesPrefix: 'I',
    // globalNamespace: true,
    // preResolveTypes: false,
    // mergeFragmentTypes: true,
  };

  const staticType = await codegen({
    schema,
    documents: [],
    filename: 'foo.ts',
    config,
    plugins: plugins.map((_plugin, i) => ({
      [i + 1]: {},
    })),
    pluginMap,
  });

  return staticType;
};

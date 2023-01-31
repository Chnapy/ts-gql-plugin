import { codegen } from '@graphql-codegen/core';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import { DocumentNode } from 'graphql';
import { parseWithRegex } from '../utils/parse-with-regex';

type CodegenPlugin = (typeof plugins)[number];
const plugins = [typescriptPlugin];

export const generateTypeFromSchema = async (
  schema: DocumentNode,
  projectName?: string,
  codegenConfig: typescriptPlugin.TypeScriptPluginConfig = {}
): Promise<string[]> => {
  const pluginMap = plugins.reduce<Record<number, CodegenPlugin>>(
    (map, plugin, i) => {
      map[i + 1] = plugin;
      return map;
    },
    {}
  );

  const config: typescriptPlugin.TypeScriptPluginConfig = {
    enumsAsTypes: true,
    declarationKind: 'interface',
    typesPrefix: projectName,
    ...codegenConfig,
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

  const redundantTypesRegex = /.*type (.+?)(<.*)?=.+;/g;

  const redundantTypes = parseWithRegex(
    staticType,
    redundantTypesRegex,
    (foundArray) => foundArray?.[0]?.trim()
  );

  const uniqueStaticTypes = staticType.replaceAll(redundantTypesRegex, '');

  return [...redundantTypes, uniqueStaticTypes];
};

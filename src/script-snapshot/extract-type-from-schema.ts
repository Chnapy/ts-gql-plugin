import { codegen } from '@graphql-codegen/core';
import * as typescriptPlugin from '@graphql-codegen/typescript';
import { DocumentNode } from 'graphql';

type CodegenPlugin = typeof plugins[number];
const plugins = [
  typescriptPlugin,
  //   typescriptOperationsPlugin,
];

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

  const staticTypeRaw = await codegen({
    schema,
    documents: [],
    filename: 'foo.ts',
    config,
    plugins: plugins.map((_plugin, i) => ({
      [i + 1]: {},
    })),
    pluginMap,
  });

  const staticType = `${staticTypeRaw}

  import { DocumentNode } from 'graphql';

  interface TypedDocumentNode<Result = { [key: string]: any }, Variables = { [key: string]: any }> extends DocumentNode {
    /**
     * This type is used to ensure that the variables you pass in to the query are assignable to Variables
     * and that the Result is assignable to whatever you pass your result to. The method is never actually
     * implemented, but the type is valid because we list it as optional
     */
    __apiType?: (variables: Variables) => Result;
  }
  `;
  //   console.log('result', staticType);

  // console.log(variablesName, operationName, variableType);
  return staticType;
};

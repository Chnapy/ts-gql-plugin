import { codegen } from '@graphql-codegen/core';
import * as typescriptOperationsPlugin from '@graphql-codegen/typescript-operations';
import { DocumentNode, parse } from 'graphql';

const documentRegex = /^[A-Za-z]*`\s*(.+)\s*`$/s;

const variablesRegex = /type (\w+Variables) = /s;
const operationsRegex = /type (\w+Operation) = /s;

type CodegenPlugin = typeof plugins[number];
const plugins = [
  // typescriptPlugin,
  typescriptOperationsPlugin,
];

export type TTExpressionTypes = {
  staticType: string;
  variableType: string;
};

export const extractTypeFromTTExpression = async (
  content: string,
  schema: DocumentNode
): Promise<TTExpressionTypes> => {
  const narrowedContent = documentRegex.exec(content)?.[1];
  if (!narrowedContent) {
    throw new Error(`GQL content not found by regex: ${content}`);
  }

  const document = parse(narrowedContent);

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

  const staticType = await codegen({
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

  // console.log('result', staticType);

  const variablesName = variablesRegex.exec(staticType)?.[1];
  if (!variablesName) {
    throw new Error(`Variables type name not found by regex: ${staticType}`);
  }

  const operationName = operationsRegex.exec(staticType)?.[1];
  if (!operationName) {
    throw new Error(`Operation type name not found by regex: ${staticType}`);
  }

  const variableType = typesToTypedDocumentNode(variablesName, operationName);
  // console.log(variablesName, operationName, variableType);
  return {
    staticType,
    variableType,
  };
};

const typesToTypedDocumentNode = (variables: string, operation: string) =>
  `TypedDocumentNode<${operation}, ${variables}>`;

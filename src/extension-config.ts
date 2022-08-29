import { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';

export type ExtensionConfig = {
  /**
   * [`graphql-codegen`](https://www.graphql-code-generator.com/) configuration,
   * using plugins [typescript](https://www.graphql-code-generator.com/plugins/typescript/typescript#config-api-reference)
   * and [typescript-operations](https://www.graphql-code-generator.com/plugins/typescript/typescript-operations#config-api-reference) configuration.
   */
  codegenConfig?: TypeScriptPluginConfig & TypeScriptDocumentsPluginConfig;
};

export const extensionName = 'ts-gql';

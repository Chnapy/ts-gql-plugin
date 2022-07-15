import { TypeScriptPluginConfig } from '@graphql-codegen/typescript';
import { TypeScriptDocumentsPluginConfig } from '@graphql-codegen/typescript-operations';

export type ExtensionConfig = {
  /**
   * Codegen config for code generation.
   */
  codegenConfig?: TypeScriptPluginConfig & TypeScriptDocumentsPluginConfig;
};

export const extensionName = 'ts-gql';

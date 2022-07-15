import {
  GraphQLExtensionDeclaration,
  GraphQLProjectConfig,
} from 'graphql-config';
import { extensionName, ExtensionConfig } from '../extension-config';

export const tsGqlExtension: GraphQLExtensionDeclaration = () => ({
  name: extensionName,
});

export const getProjectExtension = (
  project: GraphQLProjectConfig
): ExtensionConfig => project.extension(extensionName);

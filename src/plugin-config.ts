export type PluginConfig = {
  /**
   * Path to GraphQL config file.
   * By default `graphql-config` will lookup to current directory [multiple file naming](https://www.graphql-config.com/docs/user/user-usage#config-search-places).
   *
   * @see https://www.graphql-config.com/docs/user/user-introduction#examples
   */
  graphqlConfigPath?: string;

  /**
   * Plugin log level.
   */
  logLevel?: 'default' | 'verbose' | 'debug';

  /**
   * For multi-projects GraphQL config, regex for extracting project name from operation.
   */
  projectNameRegex?: string;
};

export const defaultPluginConfig: Required<Pick<PluginConfig, 'logLevel'>> = {
  logLevel: 'default',
};

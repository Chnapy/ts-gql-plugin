export type PluginConfig = {
  /**
   * Path to GraphQL config file.
   * @see https://www.graphql-config.com/docs/user/user-introduction#examples
   */
  graphqlConfigPath?: string;

  logLevel?: 'default' | 'verbose' | 'debug';

  /**
   * Regex applied to operation to extract its project name.
   */
  projectNameRegex?: string;
};

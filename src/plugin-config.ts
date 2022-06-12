export type PluginConfig = {
  /**
   * Path to GraphQL schema.
   */
  schema?: string;

  logLevel?: 'default' | 'verbose' | 'debug';
};

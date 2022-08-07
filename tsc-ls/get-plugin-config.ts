import { PluginConfig } from 'ts-gql-plugin/tools';
import ts from 'typescript';

export const getPluginConfig = (
  options: ts.CompilerOptions
): PluginConfig | null => {
  const plugins: unknown[] = Array.isArray(options.plugins)
    ? options.plugins
    : [];

  const config = plugins.find(
    (plugin): plugin is PluginConfig =>
      !!plugin &&
      typeof plugin === 'object' &&
      (plugin as Record<string, unknown>).name === 'ts-gql-plugin'
  );

  return config ?? null;
};

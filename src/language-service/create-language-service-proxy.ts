import { Diagnostic } from 'typescript/lib/tsserverlibrary';
import { LanguageServiceWithDiagnostics } from 'tsc-ls';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PromisifyFunction<F extends (...args: any[]) => any> = (
  ...args: Parameters<F>
) => Promise<ReturnType<F>>;

const pluginsDiagnosticsProperty: keyof LanguageServiceWithDiagnostics =
  'pluginsDiagnostics';

const getSemanticDiagnosticsProperty: keyof LanguageServiceWithDiagnostics =
  'getSemanticDiagnostics';

export const createLanguageServiceWithDiagnostics = (
  languageService: LanguageServiceWithDiagnostics
) => {
  const gqlDiagnosticsMap = new Map<string, Diagnostic[]>();

  /**
   * Add graphql errors to diagnostics
   */
  const getSemanticDiagnostics: LanguageServiceWithDiagnostics['getSemanticDiagnostics'] =
    (fileName) => [
      ...(proxy.pluginsDiagnostics.get(fileName) ?? []),
      ...languageService.getSemanticDiagnostics(fileName),
    ];

  const proxy = new Proxy(languageService, {
    get: (target, property) => {
      if (property === pluginsDiagnosticsProperty) {
        return target[pluginsDiagnosticsProperty] ?? gqlDiagnosticsMap;
      }

      if (property === getSemanticDiagnosticsProperty) {
        return getSemanticDiagnostics;
      }

      return target[property as keyof LanguageServiceWithDiagnostics];
    },
  }) as Required<LanguageServiceWithDiagnostics>;

  return proxy;
};

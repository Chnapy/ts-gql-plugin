import tsl from 'typescript/lib/tsserverlibrary';

const pluginsDiagnosticsProperty: keyof LanguageServiceWithDiagnostics =
  'pluginsDiagnostics';

const getSemanticDiagnosticsProperty: keyof tsl.LanguageService =
  'getSemanticDiagnostics';

export type LanguageServiceWithDiagnostics = tsl.LanguageService & {
  pluginsDiagnostics: Map<string, tsl.Diagnostic[]>;
};

export const createLanguageServiceWithDiagnostics = (
  languageService: tsl.LanguageService
): LanguageServiceWithDiagnostics => {
  const gqlDiagnosticsMap = new Map<string, tsl.Diagnostic[]>();

  /**
   * Add graphql errors to diagnostics
   */
  const getSemanticDiagnostics: tsl.LanguageService['getSemanticDiagnostics'] =
    (fileName) => [
      ...(proxy.pluginsDiagnostics.get(fileName) ?? []),
      ...languageService.getSemanticDiagnostics(fileName),
    ];

  const proxy = new Proxy(languageService as LanguageServiceWithDiagnostics, {
    get: (target, property) => {
      if (property === pluginsDiagnosticsProperty) {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        return target[pluginsDiagnosticsProperty] ?? gqlDiagnosticsMap;
      }

      if (property === getSemanticDiagnosticsProperty) {
        return getSemanticDiagnostics;
      }

      return target[property as keyof tsl.LanguageService];
    },
  });

  return proxy;
};

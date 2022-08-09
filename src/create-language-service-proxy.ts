import tsl from 'typescript/lib/tsserverlibrary';

const expectedProperty: keyof tsl.LanguageService = 'getSemanticDiagnostics';

export const createLanguageServiceProxy = (
  languageService: tsl.LanguageService,
  gqlDiagnosticsMap: Map<string, tsl.Diagnostic[]>
) => {
  /**
   * Add graphql errors to diagnostics
   */
  const getSemanticDiagnostics: tsl.LanguageService['getSemanticDiagnostics'] =
    (fileName) => [
      ...(gqlDiagnosticsMap.get(fileName) ?? []),
      ...languageService.getSemanticDiagnostics(fileName),
    ];

  return new Proxy(languageService, {
    get: (target, property) => {
      if (property !== expectedProperty) {
        return target[property as keyof tsl.LanguageService];
      }

      return getSemanticDiagnostics;
    },
  });
};

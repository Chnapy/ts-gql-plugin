#!/usr/bin/env ts-node

// TODO remove this folder, use tsc-ls package instead

import ts from 'typescript/lib/tsserverlibrary';
import { getPluginConfig } from './get-plugin-config';
import { createLanguageServiceHost } from './language-service-host';
import { getTSConfig } from './get-ts-config';
import { initPlugin } from './init-plugin';

const { tsConfig, basePath } = getTSConfig();

const pluginConfig = getPluginConfig(tsConfig.options);

const languageServiceHost = createLanguageServiceHost(tsConfig, basePath);

const languageService = initPlugin({
  basePath,
  pluginConfig,
  languageService: ts.createLanguageService(
    languageServiceHost,
    ts.createDocumentRegistry()
  ),
  languageServiceHost,
});

process.nextTick(() => {
  const program = languageService.getProgram();
  const files = program!.getSourceFiles();

  const diagnostics = files.flatMap((sf) =>
    languageService.getSemanticDiagnostics(sf.fileName)
  );

  process.stdout.write(
    ts.formatDiagnosticsWithColorAndContext(diagnostics, {
      getCurrentDirectory: () => process.cwd(),
      getCanonicalFileName: (fileName) => fileName,
      getNewLine: () => '\n',
    })
  );

  const errors = diagnostics.filter(
    ({ category }) => category === ts.DiagnosticCategory.Error
  );

  if (errors.length > 0) {
    console.log(`Found ${errors.length} errors.`);

    process.exit(1);
  }
});

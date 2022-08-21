#!/usr/bin/env ts-node

import Benchmark, { Suite } from 'benchmark';
import { execSync } from 'node:child_process';

/**
 * Run benchmark comparing "with plugin" vs "without plugin".
 * Log diff in %.
 *
 * `yarn build` should be done before this process.
 */

const runBenchmark = (): void => {
  const suite = new Suite()
    .add('compilation with plugin', () => {
      execSync('yarn tsc-ls -b ./example/tsconfig.benchmark1.json --force');
    })
    .add('compilation without plugin', () => {
      execSync('yarn tsc-ls -b ./example/tsconfig.benchmark2.json --force');
    })
    .run();

  const benchmarks: Benchmark[] = suite.slice(0, suite.length);
  const withPluginsBench = benchmarks[0];
  const withoutPluginsBench = benchmarks[1];

  const rmeMax = Math.max(
    withPluginsBench.stats.rme,
    withoutPluginsBench.stats.rme
  );

  // if uncertainty of measurement is >10%, re-run benchmark
  if (rmeMax > 10) {
    return runBenchmark();
  }

  /* eslint-disable no-mixed-operators */
  const diffPercent = Math.max(
    100 - (withPluginsBench.hz * 100) / withoutPluginsBench.hz,
    0
  );

  const name =
    'performance impact %: "with ts-gql-plugin" vs "without ts-gql-plugin"';
  const value = diffPercent.toFixed(2);
  const unit = '%';
  const pm = '\u00B1';
  const rme = rmeMax.toFixed(2);
  const size =
    withPluginsBench.stats.sample.length +
    withoutPluginsBench.stats.sample.length;

  console.log(`${name} x ${value} ${unit} ${pm}${rme}% (${size} runs sampled)`);
};

runBenchmark();

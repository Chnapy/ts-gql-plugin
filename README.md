# ts-gql-plugin

[![npm](https://img.shields.io/npm/v/ts-gql-plugin)](https://www.npmjs.com/package/ts-gql-plugin)
[![license](https://img.shields.io/npm/l/ts-gql-plugin)](https://github.com/chnapy/ts-gql-plugin/blob/master/LICENSE)

A [TypeScript Language Service Plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin) adding GraphQL DocumentNode typing.

<img src="https://raw.githubusercontent.com/chnapy/ts-gql-plugin/master/.github/images/example.gif" alt="ts-gql-plugin example" />

Using `gql` from `graphql-tag` gives you generic `DocumentNode` type, which does not allow you to manipulate typed requested data when used with Apollo for example. To resolve that you can use [code generators](https://www.graphql-code-generator.com/) creating typescript code with correct types, but it adds lot of generated code with risk of obsolete code and bad development comfort.

`ts-gql-plugin` is meant to solve this issue, by replacing most of code generation by compiler-side typing, using [TypeScript Language Service Plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin).

## Get started

Install with your package manager

```
yarn add -D ts-gql-plugin
npm install -D ts-gql-plugin
```

Then add plugin to your `tsconfig.json`

```json
{
  "compilerOptions": {
    "plugins": [
      {
        "name": "ts-gql-plugin"
      }
    ]
  }
}
```

Since this plugin use [graphql-config](https://www.graphql-config.com/docs/user/user-introduction) you should add a config file targeting your GraphQL schema.

```json
// .graphqlrc
{
  "schema": "./schema.graphql"
}
```

Depending on how you want to use it:

- [with your editor](#vscode)
- [with a CLI](#cli)

To work this plugin requires a specific syntax:

```ts
gql(`...`);
```

A concrete example:

```ts
import { gql } from 'graphql-tag';

// TypedDocumentNode<{ user, users }, { id }>
gql(`#graphql
  query User1($id: ID!) {
    user(id: $id) {
      id
      name
  }
    users {
      id
    }
  }
`);
```

> You can find more examples in [example/](./example/).

## Configuration

| Property          | Description                                                                                                                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| graphqlConfigPath | Optional. Path to GraphQL config file. By default `graphql-config` will lookup to current directory [multiple file naming](https://www.graphql-config.com/docs/user/user-usage#config-search-places). |
| logLevel          | Optional. Plugin log level. Values `'default'` - `'verbose'` - `'debug'`. Default `'default'`.                                                                                                        |

> Checkout config type in [plugin-config.ts](./src/plugin-config.ts).

## VSCode

You should [set your workspace's version of TypeScript](https://code.visualstudio.com/docs/typescript/typescript-compiling#_using-the-workspace-version-of-typescript), which will load plugins from your tsconfig.json file.

```bash
# Open VSCode command palette with Shift + Ctrl/Cmd + P
> TypeScript: Select TypeScript version...

> Use Workspace Version
```

You also have to restart TS server after **any config change**.

```bash
> TypeScript: Restart TS server
```

### TS server logs

You can see plugin logs openning TS server log

```bash
> TypeScript: Open TS server log
```

Then search for `ts-gql-plugin` occurences.

> To see more logs consider passing `logLevel` to `'verbose'` !

### GraphQL extension

To have highlighting between other features, you can use [GraphQL extension](https://marketplace.visualstudio.com/items?itemName=GraphQL.vscode-graphql) for VSCode.

Just keep in mind this extension requires to add a specific tag (`#graphql`) into your literals to be highlighten:

```ts
gql(`#graphql
  query {...}
`);
```

## CLI

Because of [Language Service design limitations](https://github.com/microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin#whats-a-language-service-plugin) `tsc` does not load plugins. So building or type-checking your files using CLI cannot use `ts-gql-plugin`.

There is no concrete solution for this issue, [it's requested for a while](https://github.com/microsoft/TypeScript/issues/16607).
But a workaround is possible, creating a script which run build/type-check using Language Service, and so this plugin.

You can find a working example in [tsc-gql/tsc-gql.ts](./tsc-gql/tsc-gql.ts).

Check also how this script is used in [package.json](./package.json) with script `c:type-gql`.

Making your own script, be sure to import from `ts-gql-plugin/tools`.

## Caveats & constraints

- Tagged template expressions are not handled, because of [type-safety issue](https://github.com/microsoft/TypeScript/issues/33304)

```ts
// not handled, waiting for TypeScript #33304
gql`
  query {...}
`;
```

- since Language Service feature is limited concerning types overriding, solution was to parse & override text source files during TS server process, which is subobtimal for performances (best solution would have been to work with AST)
- as described upper, CLI is not handled out-of-box because of `tsc` design limitations
- because TypeScript compiler does not handle async operations, required by some dependencies, so use of [`deasync`](https://github.com/abbr/deasync) is required. This lib can cause issue in your script, so consider wrap its execution into `process.nextTick()`

## Contribute

### Issues

Please fill issues with reproductible steps & relevant logs (check VSCode [TS server logs](#ts-server-logs)).

### Work on this project - get started

This project uses [devcontainers](https://code.visualstudio.com/docs/remote/containers) and is made to work on it.

Install dependencies

```
yarn install
```

Run checkers

```
yarn c:type
yarn c:lint
yarn c:test
```

Build

```
yarn build
```

Example project needs specific install

```
cd example
yarn install
```

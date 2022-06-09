# ts-gql-plugin

[![npm](https://img.shields.io/npm/v/ts-gql-plugin)](https://www.npmjs.com/package/ts-gql-plugin)
[![license](https://img.shields.io/npm/l/ts-gql-plugin)](https://github.com/chnapy/ts-gql-plugin/blob/master/LICENSE)

A [TypeScript Language Service Plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin) adding GraphQL DocumentNode typing.

Using `gql` from `graphql-tag` gives you generic `DocumentNode` type, which does not allow you to manipulate typed requested data when used with Apollo for example. To resolve that you can use [code generators](https://www.graphql-code-generator.com/) creating typescript code with correct types, but it adds lot of generated code with risk of obsolete code and bad development comfort.

`ts-gql-plugin` is meant to solve this issue, by replacing most of code generation by compiler-side typing, using [TypeScript Language Service Plugin](https://github.com/Microsoft/TypeScript/wiki/Writing-a-Language-Service-Plugin).

## Get started

## Configuration

## VSCode

## CLI

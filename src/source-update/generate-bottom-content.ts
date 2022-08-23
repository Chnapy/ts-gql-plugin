import { createUniqueString } from '../utils/create-unique-string';

export type DocumentInfos = {
  variables: string;
  result: string;
  staticTypes: string;
};

export type DocumentInfosWithLiteral = DocumentInfos & {
  literal: string;
};

export const generateBottomContent = (
  documentInfosList: DocumentInfosWithLiteral[],
  staticCode: string
) => {
  const documentMapContent = documentInfosList
    .map(
      ({ literal, variables, result }) =>
        `[\`${literal}\`]: TypedDocumentNode<${result}, ${variables}>;`
    )
    .join('\n');

  const documentStaticTypes = documentInfosList
    .map(({ staticTypes }) => staticTypes)
    .join('\n');

  const moduleName = createUniqueString();

  return `
/* eslint-disable */

declare module 'graphql-tag' {
  module ${moduleName} {
    type DocumentNode = import('graphql').DocumentNode;

    interface TypedDocumentNode<
      Result = { [key: string]: unknown },
      Variables = { [key: string]: unknown }
    > extends DocumentNode {
      /**
       * This type is used to ensure that the variables you pass in to the query are assignable to Variables
       * and that the Result is assignable to whatever you pass your result to. The method is never actually
       * implemented, but the type is valid because we list it as optional
       */
      __apiType?: (variables: Variables) => Result;
    }

    interface DocumentMap {
      ${documentMapContent}
    }

    ${staticCode}

    ${documentStaticTypes}
  }

  export function gql<Literal extends keyof ${moduleName}.DocumentMap>(
    literals: Literal
  ): ${moduleName}.DocumentMap[Literal];
}
`;
};

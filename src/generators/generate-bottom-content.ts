export type DocumentInfos = {
  variablesType: string;
  operationType: string;
};

export type DocumentInfosWithLiteral = DocumentInfos & {
  literal: string;
};

const moduleName = 'TsGql';

export const generateBottomContent = (
  documentInfosList: DocumentInfosWithLiteral[],
  staticCode: string
) => {
  const documentMapContent = documentInfosList
    .map(
      ({ literal, variablesType, operationType }) =>
        `[\`${literal}\`]: TypedDocumentNode<${operationType}, ${variablesType}>;`
    )
    .join('\n');

  const module = `
  module ${moduleName} {
    type DocumentNode = import('graphql').DocumentNode;

    export interface TypedDocumentNode<
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

    export interface DocumentMap {
      ${documentMapContent}
    }

    ${staticCode}
  }
  `;

  return `
/* eslint-disable */

${module}

declare module 'graphql-tag' {
  export function gql<Literal extends keyof ${moduleName}.DocumentMap>(
    literals: Literal
  ): ${moduleName}.DocumentMap[Literal];
}
`;
};

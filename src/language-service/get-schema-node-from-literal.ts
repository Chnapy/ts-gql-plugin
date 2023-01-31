import { ASTNode, ASTVisitor, Kind, parse, TypeNode, visit } from 'graphql';
import { getASTNodeAtPosition, IPosition } from 'graphql-language-service';
import { CachedDocumentSchemaLoader } from '../cached/cached-document-schema-loader';
import { getProjectNameFromLiteral } from '../cached/cached-literal-parser';
import { PluginConfig } from '../plugin-config';

const getNodeByVisit = <N>(
  root: ASTNode,
  getVisitor: (
    selectFn: (item: N) => void,
    getCurrentValue: () => N
  ) => ASTVisitor,
  defaultValue: N
): N => {
  let selectedItem: N = defaultValue;

  visit<ASTNode>(
    root,
    getVisitor(
      (item) => {
        selectedItem = item;
      },
      () => selectedItem
    )
  );

  return selectedItem;
};

const getTargetNodeAncestors = (literalAst: ASTNode, targetNode: ASTNode) => {
  const targetNodeKind = targetNode.kind as Kind.FIELD; // cast required for next operation

  const path = getNodeByVisit<readonly (string | number)[]>(
    literalAst,
    (select): ASTVisitor => ({
      [targetNodeKind]: {
        enter: (currentNode, key, parent, _path) => {
          if (currentNode === targetNode) {
            select([..._path]);
          }
        },
      },
    }),
    []
  );

  const targetNodePath: (ASTNode | ASTNode[])[] = [literalAst];

  for (const step of path) {
    const lastNode = targetNodePath[targetNodePath.length - 1];
    targetNodePath.push(lastNode[step as keyof typeof lastNode]!);
  }

  return targetNodePath;
};

const getNamedType = (type: TypeNode): string => {
  switch (type.kind) {
    case Kind.NON_NULL_TYPE:
    case Kind.LIST_TYPE: {
      return getNamedType(type.type);
    }
    case Kind.NAMED_TYPE: {
      return type.name.value;
    }
  }
};

export const getSchemaNodeFromLiteral = async (
  literal: string,
  cursor: IPosition,
  cachedDocumentSchemaLoader: CachedDocumentSchemaLoader,
  { projectNameRegex }: Pick<PluginConfig, 'projectNameRegex'>
): Promise<ASTNode | null> => {
  const literalAst = parse(literal);

  const targetNode = getASTNodeAtPosition(literal, literalAst, cursor);

  if (!targetNode) {
    return null;
  }

  const schemaDocumentItem = await cachedDocumentSchemaLoader.getItemOrCreate({
    projectName: getProjectNameFromLiteral(literal, projectNameRegex),
  });

  if (!schemaDocumentItem) {
    throw new Error('schemaDocumentItem not defined');
  }

  const { schemaDocument } = schemaDocumentItem;

  const targetNodePath = getTargetNodeAncestors(literalAst, targetNode);

  return targetNodePath.reduce<ASTNode>((lastFoundNode, node) => {
    if (Array.isArray(node)) {
      return lastFoundNode;
    }

    switch (node.kind) {
      case Kind.NAMED_TYPE: {
        return getNodeByVisit(
          schemaDocument,
          (select) => ({
            [Kind.INPUT_OBJECT_TYPE_DEFINITION]: {
              enter(currentNode) {
                if (currentNode.name.value === node.name.value) {
                  select(currentNode);
                }
              },
            },
          }),
          lastFoundNode
        );
      }

      case Kind.FIELD: {
        return getNodeByVisit(
          lastFoundNode,
          (select, getCurrentValue) => ({
            [Kind.FIELD_DEFINITION]: {
              enter(currentNode) {
                if (currentNode.name.value === node.name.value) {
                  const isNodeOperation = !!node.selectionSet;

                  if (isNodeOperation) {
                    if (node === targetNode) {
                      return select(currentNode);
                    }

                    if (targetNode.kind === Kind.ARGUMENT) {
                      return select(
                        getNodeByVisit(
                          currentNode,
                          (innerSelect) => ({
                            [Kind.INPUT_VALUE_DEFINITION]: {
                              enter(innerNode) {
                                if (
                                  innerNode.name.value === targetNode.name.value
                                ) {
                                  innerSelect(innerNode);
                                }
                              },
                            },
                          }),
                          getCurrentValue()
                        )
                      );
                    }

                    const typeValue = getNamedType(currentNode.type);

                    return select(
                      getNodeByVisit(
                        getCurrentValue(),
                        (innerSelect) => ({
                          [Kind.OBJECT_TYPE_DEFINITION]: {
                            enter(innerNode) {
                              if (innerNode.name.value === typeValue) {
                                innerSelect(innerNode);
                              }
                            },
                          },
                        }),
                        getCurrentValue()
                      )
                    );
                  }

                  select(currentNode);
                }
              },
            },
          }),
          lastFoundNode
        );
      }

      default: {
        return lastFoundNode;
      }
    }
  }, schemaDocument);
};

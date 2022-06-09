const getParseRegex = () => /gql\(`([^`]+)`\)(?!\sas\s)/gs;

export const parseLiteralOccurenceList = (text: string): string[] => {
  const parseRegex = getParseRegex();

  const literals: string[] = [];

  let match: RegExpExecArray | null = null;
  while ((match = parseRegex.exec(text))) {
    literals.push(match[1]);
  }

  return literals;
};

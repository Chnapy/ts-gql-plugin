export type TTExpressionOccurence = {
  content: string;
  position: number;
};

const getParseRegex = () => /(gql`[^`]+`)(?!\sas\s)/gs;

export const parseTTExpressionOccurenceList = (
  text: string
): TTExpressionOccurence[] => {
  const parseRegex = getParseRegex();

  const occurences: TTExpressionOccurence[] = [];

  let match: RegExpExecArray | null = null;
  while ((match = parseRegex.exec(text))) {
    occurences.push({
      content: match[0],
      position: match.index,
    });
  }

  return occurences;
};

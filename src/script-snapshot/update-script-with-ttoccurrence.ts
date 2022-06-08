import { TTExpressionOccurence } from './parse-ttexpression-occurence-list';

export type DraftScript = {
  text: string;
  offset: number;
};

export const updateScriptWithTTOccurence = (
  { text, offset }: DraftScript,
  { content, position }: TTExpressionOccurence,
  type: string
): DraftScript => {
  const startPosition = position + offset;
  const endPosition = startPosition + content.length;

  const firstTextHalf = text.slice(0, endPosition);
  const lastTextHalf = text.slice(endPosition);

  const typeStatement = `\` as ${type}`;
  const finalFirstTextHalf = firstTextHalf.slice(
    0,
    firstTextHalf.length - typeStatement.length
  );

  const finalText = `${finalFirstTextHalf}${typeStatement}${lastTextHalf}`;

  return {
    text: finalText,
    offset: 0, // TODO remove
  };
};

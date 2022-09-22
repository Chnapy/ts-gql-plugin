const spaceRelatedChars = new Set([' ', '\n', '\t', '(', ')', '{', '}', ':']);

export const getCurrentWordRange = (
  text: string,
  start: number,
  end: number = start
): [number, number] => {
  const startChar = text[start - 1];
  const endChar = text[end + 1];

  if (spaceRelatedChars.has(startChar) && spaceRelatedChars.has(endChar)) {
    return [start, end];
  }

  if (!spaceRelatedChars.has(startChar)) {
    start--;
  }

  if (!spaceRelatedChars.has(endChar)) {
    end++;
  }

  return getCurrentWordRange(text, start, end);
};

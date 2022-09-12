const spaceRelatedChars = new Set([' ', '\n', '\t']);

export const getCurrentWord = (text: string, start: number): string => {
  const currentChar = text[start];

  if (spaceRelatedChars.has(currentChar)) {
    return '';
  }

  return currentChar + getCurrentWord(text, start + 1);
};

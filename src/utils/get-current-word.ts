import { getCurrentWordRange } from './get-current-word-range';

export const getCurrentWord = (text: string, position: number): string => {
  const [start, end] = getCurrentWordRange(text, position);

  return text.slice(start, end + 1);
};

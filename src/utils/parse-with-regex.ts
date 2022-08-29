export const parseWithRegex = (
  source: string,
  regex: RegExp,
  callback: (foundArray: RegExpExecArray | null) => string | undefined,
  foundList: string[] = []
): string[] => {
  const found = callback(regex.exec(source));
  if (!found) {
    return foundList;
  }

  return [found, ...parseWithRegex(source, regex, callback, foundList)];
};

export const createUniqueString = () =>
  `_${Math.random().toString(36).slice(2, 12)}`;

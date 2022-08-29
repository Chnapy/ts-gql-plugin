/**
 * Transform union to tuple forcing every possible values to be present, in order.
 *
 * @example
 * const languages: UnionToArray<'typescript' | 'java'> = ['typescript', 'java'];
 *
 * @see https://catchts.com/union-array
 * @author Serhii <sergiybiluk@gmail.com>
 */
export type UnionToArray<T, A extends unknown[] = []> = IsUnion<T> extends true
  ? UnionToArray<Exclude<T, PopUnion<T>>, [PopUnion<T>, ...A]>
  : [T, ...A];

/**
 * @see https://stackoverflow.com/a/50375286
 */
type UnionToIntersection<U> = (
  U extends unknown ? (k: U) => void : never
) extends (k: infer I) => void
  ? I
  : never;

/**
 * Converts union to overloaded function
 */
type UnionToOvlds<U> = UnionToIntersection<
  U extends unknown ? (f: U) => void : never
>;

type PopUnion<U> = UnionToOvlds<U> extends (a: infer A) => void ? A : never;

type IsUnion<T> = [T] extends [UnionToIntersection<T>] ? false : true;

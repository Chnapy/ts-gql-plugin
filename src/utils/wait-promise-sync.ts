import { loopWhile } from 'deasync';

export const waitPromiseSync = <R>(promise: Promise<R>): R => {
  let done = false;
  let result: R | null = null;
  let error: Error | null = null;

  promise
    .then((result_) => {
      result = result_;
      done = true;
    })
    .catch((error_: Error) => {
      error = error_;
      done = true;
    });

  loopWhile(() => !done);

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  if (error) {
    throw error;
  }

  return result!;
};

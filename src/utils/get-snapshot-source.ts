import type TSL from 'typescript/lib/tsserverlibrary';

export const getSnapshotSource = (snapshot: TSL.IScriptSnapshot) =>
  snapshot.getText(0, snapshot.getLength());

import { IPosition } from 'graphql-language-service';

export class CursorPosition implements IPosition {
  constructor(public line: number, public character: number) {}

  lessThanOrEqualTo(pos: CursorPosition): boolean {
    if (this.line < pos.line) {
      return true;
    }
    if (this.line > pos.line) {
      return false;
    }
    return this.character <= pos.character;
  }

  setCharacter(character: number): void {
    this.character = character;
  }

  setLine(line: number): void {
    this.line = line;
  }
}

import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { TownEmitter } from '../types/CoveyTownSocket';
import CheckersArea from './CheckersArea';
import CheckerBoard from '../lib/CheckerBoard';

describe('CheckersArea', () => {
  const testAreaBox = { x: 100, y: 100, width: 100, height: 100 };
  let testArea: CheckersArea;
  const townEmitter = mock<TownEmitter>();
  const id = nanoid();
  const playerOneID = undefined;
  const playerTwoID = undefined;
  const isPlayerOneTurn = true;
  const board = new CheckerBoard(null);
  const preBoard = board.precompute('black');

  beforeEach(() => {
    mockClear(townEmitter);
    testArea = new CheckersArea(
      { id, board, playerOneID, playerTwoID, isPlayerOneTurn, preBoard },
      testAreaBox,
      townEmitter,
    );
  });
  test('toModel returns the correct id, board, playerOneID, playerTWOID, and isPlayerOneTurn', () => {
    const model = testArea.toModel();
    expect(model).toEqual({
      id,
      board,
      playerOneID,
      playerTwoID,
      isPlayerOneTurn,
      preBoard,
    });
  });
  test("updateModel sets board, playerOneID, playerTWOID, and isPlayerOneTurn, but id doesn't change", () => {
    const newId = 'spam';
    const newBoard = new CheckerBoard(null);
    // Clear the board to empty
    newBoard.clearBoard();
    const newPlayerOneID = 'player1';
    const newPlayerTwoID = 'player2';
    const otherPlayersTurn = false;
    testArea.updateModel({
      id: newId,
      board: newBoard,
      playerOneID: newPlayerOneID,
      playerTwoID: newPlayerTwoID,
      isPlayerOneTurn: otherPlayersTurn,
      preBoard: new CheckerBoard(board).precompute('black'),
    });
    expect(testArea.id).toBe(id);
    expect(testArea.board).toBe(newBoard);
    expect(testArea.playerOneID).toBe(newPlayerOneID);
    expect(testArea.playerTwoID).toBe(newPlayerTwoID);
    expect(testArea.isPlayerOneTurn).toBe(otherPlayersTurn);
  });
  describe('[OMG2 fromMapObject]', () => {
    it('Throws an error if the width or height are missing', () => {
      expect(() =>
        CheckersArea.fromMapObject(
          { id: 1, name: nanoid(), visible: true, x: 0, y: 0 },
          townEmitter,
        ),
      ).toThrowError();
    });
    it('Creates a new checkers area using the provided boundingBox and id, with no player one or two, and emitter', () => {
      const x = 30;
      const y = 20;
      const width = 10;
      const height = 20;
      const name = 'name';
      const val = CheckersArea.fromMapObject(
        { x, y, width, height, name, id: 10, visible: true },
        townEmitter,
      );
      expect(val.boundingBox).toEqual({ x, y, width, height });
      expect(val.id).toEqual(name);
      expect(val.board).toEqual(board);
      expect(val.playerOneID).toBeUndefined();
      expect(val.playerTwoID).toBeUndefined();
      expect(val.isPlayerOneTurn).toBeTruthy();
    });
  });
});

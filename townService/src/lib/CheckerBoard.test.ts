import { mock, mockClear } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import CheckerBoard from './CheckerBoard';
import { CheckerPiece, Pos } from '../types/CoveyTownSocket';

describe('CheckerBoard', () => {
  let checkersGame: CheckerBoard;

  beforeEach(() => {
    checkersGame = new CheckerBoard(null);
  });

  describe('precompute', () => {
    it('Generates a correct array of starting moves for the starting board from the red side', () => {
      const computeBoard = checkersGame.precompute('red');
      const coords1 = computeBoard[2][1];
      const coords2 = computeBoard[2][7];
      expect(coords1).toEqual([[{ row: 3, col: 0 }], [{ row: 3, col: 2 }]]);
      expect(coords2).toEqual([[{ row: 3, col: 6 }]]);
    });
    /**
     * This initial test case is all that is needed for precompute as precompute is tested
     * implicitly through movePiece as movePiece calls precompute to the movePath for a piece
     * at a starting position, thus testing that precompute comes up with the correct path for each
     * test case for movePiece
     */
  });

  describe('movePiece', () => {
    it('Moving a starting piece at row 2 col 1 to row 3 col 0 works', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };

      expect(checkersGame.board[2][1].piece).toEqual(redPiece);
      expect(checkersGame.board[3][0].piece).toEqual(null);

      const startPos: Pos = { row: 2, col: 1 };
      const endPos: Pos = { row: 3, col: 0 };

      checkersGame.movePiece(startPos, endPos, 'red');

      expect(checkersGame.board[2][1].piece).toEqual(null);
      expect(checkersGame.board[3][0].piece).toEqual(redPiece);
    });

    it('Hopping a piece works', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };

      const startPos1: Pos = { row: 2, col: 1 };
      const endPos1: Pos = { row: 3, col: 2 };
      const startPos2: Pos = { row: 3, col: 2 };
      const endPos2: Pos = { row: 4, col: 3 };
      const startPos3: Pos = { row: 5, col: 4 };

      expect(checkersGame.board[2][1].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos1, endPos1, 'red');

      expect(checkersGame.board[3][2].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos2, endPos2, 'red');

      expect(checkersGame.board[4][3].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos3, endPos1, 'black');

      expect(checkersGame.board[3][2].piece).toEqual(blackPiece);
      expect(checkersGame.board[4][3].piece).toEqual(null);
    });

    it('Double hopping a piece works', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };

      const startPos0: Pos = { row: 1, col: 0 };
      const startPos1: Pos = { row: 2, col: 1 };
      const endPos1: Pos = { row: 3, col: 2 };
      const startPos2: Pos = { row: 3, col: 2 };
      const endPos2: Pos = { row: 4, col: 3 };
      const startPos3: Pos = { row: 5, col: 4 };

      expect(checkersGame.board[2][1].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos1, endPos1, 'red');

      expect(checkersGame.board[2][1].piece).toEqual(null);
      expect(checkersGame.board[3][2].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos2, endPos2, 'red');

      expect(checkersGame.board[3][2].piece).toEqual(null);
      expect(checkersGame.board[4][3].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos0, startPos1, 'red');

      expect(checkersGame.board[1][0].piece).toEqual(null);
      expect(checkersGame.board[2][1].piece).toEqual(redPiece);

      checkersGame.movePiece(startPos3, startPos0, 'black');

      expect(checkersGame.board[1][0].piece).toEqual(blackPiece);
      expect(checkersGame.board[5][4].piece).toEqual(null);
      expect(checkersGame.board[2][1].piece).toEqual(null);
      expect(checkersGame.board[4][3].piece).toEqual(null);
    });

    it('will work for a fork move', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };

      const startPos1: Pos = { row: 2, col: 1 };
      const endPos1: Pos = { row: 3, col: 2 };
      const endPos2: Pos = { row: 4, col: 3 }; // startPos2 is going to be endPos1
      const startPos3: Pos = { row: 1, col: 0 };
      const endPos3: Pos = { row: 2, col: 1 };
      const startPos4: Pos = { row: 2, col: 5 };
      const endPos4: Pos = { row: 3, col: 6 };
      const startPos5: Pos = { row: 1, col: 4 }; // endPos of this is going to startPos4

      const startPos6: Pos = { row: 5, col: 4 }; // endPos of this is going to be startPos3

      checkersGame.movePiece(startPos1, endPos1, 'red');

      expect(checkersGame.board[3][2].piece).toEqual(redPiece);
      expect(checkersGame.board[2][1].piece).toEqual(null);

      checkersGame.movePiece(endPos1, endPos2, 'red');

      expect(checkersGame.board[4][3].piece).toEqual(redPiece);
      expect(checkersGame.board[3][2].piece).toEqual(null);

      checkersGame.movePiece(startPos3, endPos3, 'red');

      expect(checkersGame.board[2][1].piece).toEqual(redPiece);
      expect(checkersGame.board[1][0].piece).toEqual(null);

      checkersGame.movePiece(startPos4, endPos4, 'red');

      expect(checkersGame.board[3][6].piece).toEqual(redPiece);
      expect(checkersGame.board[2][5].piece).toEqual(null);

      checkersGame.movePiece(startPos5, startPos4, 'red');

      expect(checkersGame.board[2][5].piece).toEqual(redPiece);
      expect(checkersGame.board[1][4].piece).toEqual(null);

      checkersGame.movePiece(startPos6, startPos3, 'black');

      expect(checkersGame.board[1][0].piece).toEqual(blackPiece);
      expect(checkersGame.board[5][4].piece).toEqual(null);
      expect(checkersGame.board[2][1].piece).toEqual(null);
      expect(checkersGame.board[4][3].piece).toEqual(null);
    });

    it('will work for a fork move in the other direction', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };

      const startPos1: Pos = { row: 2, col: 1 };
      const endPos1: Pos = { row: 3, col: 2 };
      const endPos2: Pos = { row: 4, col: 3 }; // startPos2 is going to be endPos1
      const startPos3: Pos = { row: 1, col: 0 };
      const endPos3: Pos = { row: 2, col: 1 };
      const startPos4: Pos = { row: 2, col: 5 };
      const endPos4: Pos = { row: 3, col: 6 };
      const startPos5: Pos = { row: 1, col: 4 }; // endPos of this is going to startPos4

      const startPos6: Pos = { row: 5, col: 4 }; // endPos of this is going to be startPos5

      checkersGame.movePiece(startPos1, endPos1, 'red');

      expect(checkersGame.board[3][2].piece).toEqual(redPiece);
      expect(checkersGame.board[2][1].piece).toEqual(null);

      checkersGame.movePiece(endPos1, endPos2, 'red');

      expect(checkersGame.board[4][3].piece).toEqual(redPiece);
      expect(checkersGame.board[3][2].piece).toEqual(null);

      checkersGame.movePiece(startPos3, endPos3, 'red');

      expect(checkersGame.board[2][1].piece).toEqual(redPiece);
      expect(checkersGame.board[1][0].piece).toEqual(null);

      checkersGame.movePiece(startPos4, endPos4, 'red');

      expect(checkersGame.board[3][6].piece).toEqual(redPiece);
      expect(checkersGame.board[2][5].piece).toEqual(null);

      checkersGame.movePiece(startPos5, startPos4, 'red');

      expect(checkersGame.board[2][5].piece).toEqual(redPiece);
      expect(checkersGame.board[1][4].piece).toEqual(null);

      checkersGame.movePiece(startPos6, startPos5, 'black');

      expect(checkersGame.board[1][4].piece).toEqual(blackPiece);
      expect(checkersGame.board[5][4].piece).toEqual(null);
      expect(checkersGame.board[4][3].piece).toEqual(null);
      expect(checkersGame.board[2][3].piece).toEqual(null);
    });

    it('test bug to see if issue is on front or back end', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };

      const startPos1: Pos = { row: 2, col: 1 };
      const endPos1: Pos = { row: 3, col: 0 };
      const startPos2: Pos = { row: 3, col: 0 };
      const endPos2: Pos = { row: 4, col: 1 };
      const startPos3: Pos = { row: 5, col: 2 };
      const endPos3: Pos = { row: 4, col: 3 };
      const startPos4: Pos = { row: 4, col: 3 };
      const endPos4: Pos = { row: 3, col: 2 };
      const startPos5: Pos = { row: 4, col: 1 };
      const endPos5: Pos = { row: 5, col: 2 };

      checkersGame.movePiece(startPos1, endPos1, 'red');
      checkersGame.movePiece(startPos2, endPos2, 'red');
      checkersGame.movePiece(startPos3, endPos3, 'black');
      checkersGame.movePiece(startPos4, endPos4, 'black');
      checkersGame.movePiece(startPos5, endPos5, 'red');
    });

    it('specific case where triangle isKingHop doesnt remove correct pieces', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const blackKingPiece: CheckerPiece = { color: 'black', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 2, col: 3 };
      const setPos2: Pos = { row: 1, col: 4 };
      const setPos3: Pos = { row: 1, col: 6 };
      const setPos4: Pos = { row: 2, col: 5 };

      checkersGame.setPiece(setPos1, 'black');
      checkersGame.setPiece(setPos2, 'red');
      checkersGame.setPiece(setPos3, 'red');
      checkersGame.setPiece(setPos4, 'red');

      const startPos: Pos = { row: 2, col: 3 };
      const endPos: Pos = { row: 2, col: 7 };

      checkersGame.movePiece(startPos, endPos, 'black');

      expect(checkersGame.board[2][7].piece).toEqual(blackKingPiece);
      expect(checkersGame.board[2][7].piece?.isKing).toEqual(true);
      expect(checkersGame.board[2][5].piece).toEqual(redPiece);
      expect(checkersGame.board[1][4].piece).toEqual(null);
      expect(checkersGame.board[1][6].piece).toEqual(null);
    });

    it('specific case where loop around past itself doesnt show up in precompute', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const blackKingPiece: CheckerPiece = { color: 'black', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 2, col: 3 };
      const setPos2: Pos = { row: 1, col: 4 };
      const setPos3: Pos = { row: 1, col: 6 };
      const setPos4: Pos = { row: 2, col: 5 };
      const setPos5: Pos = { row: 3, col: 6 };

      checkersGame.setPiece(setPos1, 'black');
      checkersGame.setPiece(setPos2, 'red');
      checkersGame.setPiece(setPos3, 'red');
      checkersGame.setPiece(setPos4, 'red');
      checkersGame.setPiece(setPos5, 'red');

      const startPos: Pos = { row: 2, col: 3 };
      const endPos: Pos = { row: 4, col: 5 };

      checkersGame.movePiece(startPos, endPos, 'black');

      expect(checkersGame.board[4][5].piece).toEqual(blackKingPiece);
      expect(checkersGame.board[4][5].piece?.isKing).toEqual(true);
      expect(checkersGame.board[2][5].piece).toEqual(redPiece);
      expect(checkersGame.board[1][4].piece).toEqual(null);
      expect(checkersGame.board[1][6].piece).toEqual(null);
      expect(checkersGame.board[3][6].piece).toEqual(null);
    });

    it('specific case where longer triangle isKingHop doesnt remove correct pieces', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const redKingPiece: CheckerPiece = { color: 'red', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 3, col: 6 };
      const setPos2: Pos = { row: 4, col: 5 };
      const setPos3: Pos = { row: 6, col: 3 };
      const setPos4: Pos = { row: 6, col: 1 };
      const setPos5: Pos = { row: 5, col: 4 };

      checkersGame.setPiece(setPos1, 'red');
      checkersGame.setPiece(setPos2, 'black');
      checkersGame.setPiece(setPos3, 'black');
      checkersGame.setPiece(setPos4, 'black');

      const startPos: Pos = { row: 3, col: 6 };
      const endPos: Pos = { row: 5, col: 0 };

      checkersGame.movePiece(startPos, endPos, 'red');

      expect(checkersGame.board[5][0].piece).toEqual(redKingPiece);
      expect(checkersGame.board[5][0].piece?.isKing).toEqual(true);
      expect(checkersGame.board[3][6].piece).toEqual(null);
      expect(checkersGame.board[4][5].piece).toEqual(null);
      expect(checkersGame.board[6][1].piece).toEqual(null);
      expect(checkersGame.board[6][3].piece).toEqual(null);
    });

    it('will hop in a cycle, returning back to a square when black is hopping', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const blackKingPiece: CheckerPiece = { color: 'black', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 1, col: 3 };
      const setPos2: Pos = { row: 1, col: 5 };
      const setPos3: Pos = { row: 3, col: 3 };
      const setPos4: Pos = { row: 3, col: 5 };
      const setPos5: Pos = { row: 5, col: 3 };
      const setPos6: Pos = { row: 5, col: 5 };
      const setPos7: Pos = { row: 6, col: 2 };

      checkersGame.setPiece(setPos1, 'red');
      checkersGame.setPiece(setPos2, 'red');
      checkersGame.setPiece(setPos3, 'red');
      checkersGame.setPiece(setPos4, 'red');
      checkersGame.setPiece(setPos5, 'red');
      checkersGame.setPiece(setPos6, 'red');
      checkersGame.setPiece(setPos7, 'black');

      const startPos: Pos = { row: 6, col: 2 };
      const endPos: Pos = { row: 6, col: 6 };

      checkersGame.movePiece(startPos, endPos, 'black');

      expect(checkersGame.board[6][6].piece).toEqual(blackKingPiece);
      expect(checkersGame.board[6][6].piece?.isKing).toEqual(true);
      expect(checkersGame.board[1][3].piece).toEqual(null);
      expect(checkersGame.board[1][5].piece).toEqual(null);
      expect(checkersGame.board[3][3].piece).toEqual(null);
      expect(checkersGame.board[3][5].piece).toEqual(null);
      expect(checkersGame.board[5][5].piece).toEqual(null);
      expect(checkersGame.board[5][3].piece).toEqual(null);
    });

    it('will hop in a cycle, returning back to a square when red is hopping', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const redKingPiece: CheckerPiece = { color: 'red', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 2, col: 2 };
      const setPos2: Pos = { row: 2, col: 4 };
      const setPos3: Pos = { row: 4, col: 4 };
      const setPos4: Pos = { row: 4, col: 2 };
      const setPos5: Pos = { row: 6, col: 2 };
      const setPos6: Pos = { row: 6, col: 4 };
      const setPos7: Pos = { row: 1, col: 5 };

      checkersGame.setPiece(setPos1, 'black');
      checkersGame.setPiece(setPos2, 'black');
      checkersGame.setPiece(setPos3, 'black');
      checkersGame.setPiece(setPos4, 'black');
      checkersGame.setPiece(setPos5, 'black');
      checkersGame.setPiece(setPos6, 'black');
      checkersGame.setPiece(setPos7, 'red');

      const startPos: Pos = { row: 1, col: 5 };
      const endPos: Pos = { row: 1, col: 1 };

      checkersGame.movePiece(startPos, endPos, 'red');

      expect(checkersGame.board[1][1].piece).toEqual(redKingPiece);
      expect(checkersGame.board[1][1].piece?.isKing).toEqual(true);
      expect(checkersGame.board[2][2].piece).toEqual(null);
      expect(checkersGame.board[2][4].piece).toEqual(null);
      expect(checkersGame.board[4][2].piece).toEqual(null);
      expect(checkersGame.board[4][4].piece).toEqual(null);
      expect(checkersGame.board[6][4].piece).toEqual(null);
      expect(checkersGame.board[6][2].piece).toEqual(null);
    });

    it('will hop in a cycle, returning back to its own start square', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const redKingPiece: CheckerPiece = { color: 'red', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 4, col: 1 };
      const setPos2: Pos = { row: 4, col: 3 };
      const setPos3: Pos = { row: 6, col: 1 };
      const setPos4: Pos = { row: 6, col: 3 };
      const setPos5: Pos = { row: 4, col: 5 };
      const setPos6: Pos = { row: 3, col: 2 };

      checkersGame.setPiece(setPos1, 'black');
      checkersGame.setPiece(setPos2, 'black');
      checkersGame.setPiece(setPos3, 'black');
      checkersGame.setPiece(setPos4, 'black');
      checkersGame.setPiece(setPos5, 'black');
      checkersGame.setPiece(setPos6, 'red');

      const startPos: Pos = { row: 3, col: 2 };
      const endPos: Pos = { row: 3, col: 2 };

      checkersGame.movePiece(startPos, endPos, 'red');

      expect(checkersGame.board[3][2].piece).toEqual(redKingPiece);
      expect(checkersGame.board[3][2].piece?.isKing).toEqual(true);
      expect(checkersGame.board[4][3].piece).toEqual(null);
      expect(checkersGame.board[6][1].piece).toEqual(null);
      expect(checkersGame.board[6][3].piece).toEqual(null);
      expect(checkersGame.board[4][1].piece).toEqual(null);
      expect(checkersGame.board[4][5].piece).toEqual(blackPiece);
    });

    it('with a cycle on the board it will go to the other fork', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const redKingPiece: CheckerPiece = { color: 'red', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 4, col: 1 };
      const setPos2: Pos = { row: 4, col: 3 };
      const setPos3: Pos = { row: 6, col: 1 };
      const setPos4: Pos = { row: 6, col: 3 };
      const setPos5: Pos = { row: 4, col: 1 };
      const setPos6: Pos = { row: 4, col: 5 };
      const setPos7: Pos = { row: 3, col: 2 };

      checkersGame.setPiece(setPos1, 'black');
      checkersGame.setPiece(setPos2, 'black');
      checkersGame.setPiece(setPos3, 'black');
      checkersGame.setPiece(setPos4, 'black');
      checkersGame.setPiece(setPos5, 'black');
      checkersGame.setPiece(setPos6, 'black');
      checkersGame.setPiece(setPos7, 'red');

      const startPos: Pos = { row: 3, col: 2 };
      const endPos: Pos = { row: 3, col: 6 };

      checkersGame.movePiece(startPos, endPos, 'red');

      expect(checkersGame.board[3][6].piece).toEqual(redKingPiece);
      expect(checkersGame.board[3][6].piece?.isKing).toEqual(true);
      expect(checkersGame.board[4][1].piece).toEqual(null);
      expect(checkersGame.board[6][1].piece).toEqual(null);
      expect(checkersGame.board[6][3].piece).toEqual(null);
      expect(checkersGame.board[4][5].piece).toEqual(null);
      expect(checkersGame.board[4][3].piece).toEqual(blackPiece);
    });

    it('will hop in a cycle, going through its own start square', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const redKingPiece: CheckerPiece = { color: 'red', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 4, col: 1 };
      const setPos2: Pos = { row: 4, col: 3 };
      const setPos3: Pos = { row: 6, col: 1 };
      const setPos4: Pos = { row: 6, col: 3 };
      const setPos5: Pos = { row: 4, col: 1 };
      const setPos6: Pos = { row: 4, col: 5 };
      const setPos7: Pos = { row: 2, col: 1 };
      const setPos8: Pos = { row: 3, col: 2 };

      checkersGame.setPiece(setPos1, 'black');
      checkersGame.setPiece(setPos2, 'black');
      checkersGame.setPiece(setPos3, 'black');
      checkersGame.setPiece(setPos4, 'black');
      checkersGame.setPiece(setPos5, 'black');
      checkersGame.setPiece(setPos6, 'black');
      checkersGame.setPiece(setPos7, 'black');
      checkersGame.setPiece(setPos8, 'red');

      const startPos: Pos = { row: 3, col: 2 };
      const endPos: Pos = { row: 1, col: 0 };

      checkersGame.movePiece(startPos, endPos, 'red');

      expect(checkersGame.board[1][0].piece).toEqual(redKingPiece);
      expect(checkersGame.board[1][0].piece?.isKing).toEqual(true);
      expect(checkersGame.board[4][1].piece).toEqual(null);
      expect(checkersGame.board[4][3].piece).toEqual(null);
      expect(checkersGame.board[6][1].piece).toEqual(null);
      expect(checkersGame.board[6][3].piece).toEqual(null);
      expect(checkersGame.board[2][1].piece).toEqual(null);
      expect(checkersGame.board[4][5].piece).toEqual(blackPiece);
    });

    it('king can hop backwards twice', () => {
      const redPiece: CheckerPiece = { color: 'red', isKing: false };
      const blackPiece: CheckerPiece = { color: 'black', isKing: false };
      const blackKingPiece: CheckerPiece = { color: 'black', isKing: true };

      checkersGame.clearBoard();
      const setPos1: Pos = { row: 1, col: 0 };
      const setPos2: Pos = { row: 1, col: 2 };
      const setPos3: Pos = { row: 3, col: 4 };

      checkersGame.setPiece(setPos2, 'red');
      checkersGame.setPiece(setPos3, 'red');
      checkersGame.setPiece(setPos1, 'black');

      const startPos1: Pos = { row: 1, col: 0 };
      const endPos1: Pos = { row: 0, col: 1 };

      checkersGame.movePiece(startPos1, endPos1, 'black');

      expect(checkersGame.board[0][1].piece).toEqual(blackKingPiece);
      expect(checkersGame.board[0][1].piece?.isKing).toEqual(true);

      const startPos2: Pos = { row: 0, col: 1 };
      const endPos2: Pos = { row: 4, col: 5 };

      checkersGame.movePiece(startPos2, endPos2, 'black');

      expect(checkersGame.board[4][5].piece).toEqual(blackKingPiece);
      expect(checkersGame.board[1][2].piece).toEqual(null);
      expect(checkersGame.board[3][4].piece).toEqual(null);
    });
  });

  describe('isGameOver', () => {
    it('shows that the game is over and red has won when black has no more pieces and red still has pieces', () => {
      checkersGame.clearBoard();
      const setPos1: Pos = { row: 1, col: 0 };
      const setPos2: Pos = { row: 1, col: 2 };
      const setPos3: Pos = { row: 3, col: 4 };

      checkersGame.setPiece(setPos2, 'red');
      checkersGame.setPiece(setPos3, 'red');
      checkersGame.setPiece(setPos1, 'black');

      const startPos1: Pos = { row: 1, col: 0 };
      const endPos1: Pos = { row: 0, col: 1 };

      checkersGame.movePiece(startPos1, endPos1, 'black');

      expect(checkersGame.isGameOver()).toEqual('none');

      const startPos2: Pos = { row: 0, col: 1 };
      const endPos2: Pos = { row: 4, col: 5 };

      checkersGame.movePiece(startPos2, endPos2, 'black');

      expect(checkersGame.isGameOver()).toEqual('black');
    });

    it('shows that the game is over and black has won when red has no more pieces and black still has pieces', () => {
      checkersGame.clearBoard();
      const setPos1: Pos = { row: 1, col: 0 };
      checkersGame.setPiece(setPos1, 'red');
      expect(checkersGame.isGameOver()).toEqual('red');
    });

    it('shows that the game is not over, returning none when both sides still have pieces', () => {
      checkersGame.clearBoard();

      const setPos1: Pos = { row: 1, col: 0 };
      const setPos2: Pos = { row: 1, col: 2 };
      const setPos3: Pos = { row: 3, col: 4 };

      checkersGame.setPiece(setPos2, 'red');
      checkersGame.setPiece(setPos3, 'red');
      checkersGame.setPiece(setPos1, 'black');

      expect(checkersGame.isGameOver()).toEqual('none');
    });
  });
});

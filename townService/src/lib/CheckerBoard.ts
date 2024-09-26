import { CheckerBoardModel, CheckerTile, CheckerPiece, Pos } from '../types/CoveyTownSocket';

/**
 * Class that represents the state of a checkerboard inlcuding tiles and pieces on tiles
 */
export default class CheckerBoard {
  /** The 8 by 8 board with checker pieces * */
  public board: CheckerTile[][];

  /** The number of black pieces */
  private _blackPieceCount: number;

  /** The number of red pieces */
  private _redPieceCount: number;

  /**
   * Constructor
   * @param model board to initialize this checkerBoard object with. If null, generates fresh board and defaults the fields of class
   */
  constructor(model: null | CheckerBoardModel) {
    this.board = model ? model.board : CheckerBoard.initBoard();
    this._blackPieceCount = model ? this._countNumPieces('black') : 12;
    this._redPieceCount = model ? this._countNumPieces('red') : 12;
  }

  /**
   * Makes all pieces on the board null, used for testing
   */
  public clearBoard() {
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        let currTileShade: 'light' | 'dark' = 'light';
        // determining tile shade
        if (i % 2 === 0) {
          currTileShade = j % 2 === 0 ? 'light' : 'dark';
        } else {
          currTileShade = j % 2 === 0 ? 'dark' : 'light';
        }
        this.board[i][j] = { shade: currTileShade, piece: null };
      }
    }
  }

  /**
   * Sets the position passed in to have a non king piece of the inputted color, used for testing
   * @param piecePos the position to add a piece
   * @param pieceColor the color of the piece to be added
   */
  /**
   * Sets the position passed in to have a non king piece of the inputted color, used for testing
   * @param piecePos the position to add a piece
   * @param pieceColor the color of the piece to be added
   */
  public setPiece(piecePos: Pos, pieceColor: 'red' | 'black') {
    const currTileShade = this.board[piecePos.row][piecePos.col].shade;
    const newPiece: CheckerPiece = { color: pieceColor, isKing: false };
    this.board[piecePos.row][piecePos.col] = { shade: currTileShade, piece: newPiece };
  }

  /**
   * Initializes a checkers board
   * For even rows, tiles are light on odd columns; the opposite for odd row
   * Pieces are initially placed on all dark tiles within the first 3 rows and last 3 rows
   * @returns an initial checkers board
   */
  public static initBoard(): CheckerTile[][] {
    const returnBoard: CheckerTile[][] = [];

    for (let row = 0; row < 8; row += 1) {
      returnBoard[row] = [];
      for (let col = 0; col < 8; col += 1) {
        let currTileShade: 'light' | 'dark' = 'light';
        let currPiece: CheckerPiece | null = null;

        // determining tile shade
        if (row % 2 === 0) {
          currTileShade = col % 2 === 0 ? 'light' : 'dark';
        } else {
          currTileShade = col % 2 === 0 ? 'dark' : 'light';
        }

        // determining piece based on tile and current row
        if (currTileShade === 'dark' && (row < 3 || row >= 5)) {
          currPiece = { color: row < 3 ? 'red' : 'black', isKing: false };
        }

        returnBoard[row][col] = { shade: currTileShade, piece: currPiece };
      }
    }

    return returnBoard;
  }

  /**
   * Counts the number of pieces of the inputted color
   * @param pieceColor the color of the piece to count
   * @returns the number of pieces of the inputted color
   */
  private _countNumPieces(pieceColor: 'red' | 'black'): number {
    let pieceCount = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        const piecePos: Pos = { row: i, col: j };
        if (this._getPieceColorAtPos(piecePos) === pieceColor) {
          pieceCount++;
        }
      }
    }
    return pieceCount;
  }

  /**
   * Precomputes a grid of possible moves for each active piece on board
   * @param currentMoveColor the color of the player making the move
   * @returns a grid of possible moves for each active piece on the board
   */
  public precompute(currentMoveColor: 'red' | 'black'): Pos[][][][] {
    const preGrid: Pos[][][][] = [];
    for (let i = 0; i < 8; i++) {
      preGrid[i] = [];
      for (let j = 0; j < 8; j++) {
        const tile = this.board[i][j];
        if (
          tile !== null &&
          tile.piece !== null &&
          tile.piece &&
          tile.piece.color === currentMoveColor
        ) {
          const curPos: Pos = { row: i, col: j };
          preGrid[i][j] = this._getPieceMoves(curPos, currentMoveColor, tile.piece.isKing);
        } else {
          preGrid[i][j] = [];
        }
      }
    }
    return preGrid;
  }

  /**
   * Gets all possible moves for a piece at the inputted postion
   * @param piecePos the position of the piece that is being moved
   * @param currentMoveColor the color of the piece being moved
   * @param isKing is the piece a king
   * @returns a list of possible moves for the piece at the piece position
   */
  private _getPieceMoves(
    piecePos: Pos,
    currentMoveColor: 'red' | 'black',
    isKing: boolean,
  ): Pos[][] {
    let posList: Pos[][] = [];

    const upLeftMove: Pos = { row: piecePos.row - 1, col: piecePos.col - 1 };
    const upLeftHop: Pos = { row: piecePos.row - 2, col: piecePos.col - 2 };

    const upRightMove: Pos = { row: piecePos.row - 1, col: piecePos.col + 1 };
    const upRightHop: Pos = { row: piecePos.row - 2, col: piecePos.col + 2 };

    const downLeftMove: Pos = { row: piecePos.row + 1, col: piecePos.col - 1 };
    const downLeftHop: Pos = { row: piecePos.row + 2, col: piecePos.col - 2 };

    const downRightMove: Pos = { row: piecePos.row + 1, col: piecePos.col + 1 };
    const downRightHop: Pos = { row: piecePos.row + 2, col: piecePos.col + 2 };

    if (isKing) {
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          upLeftMove,
          upLeftHop,
          true,
        ),
      );
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          upRightMove,
          upRightHop,
          true,
        ),
      );
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          downLeftMove,
          downLeftHop,
          true,
        ),
      );
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          downRightMove,
          downRightHop,
          true,
        ),
      );
    } else if (currentMoveColor === 'black') {
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          upLeftMove,
          upLeftHop,
          false,
        ),
      );
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          upRightMove,
          upRightHop,
          false,
        ),
      );
    } else if (currentMoveColor === 'red') {
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          downLeftMove,
          downLeftHop,
          false,
        ),
      );
      posList = this._combineList(
        posList,
        this._getMoveByDirection(
          piecePos,
          [],
          false,
          currentMoveColor,
          downRightMove,
          downRightHop,
          false,
        ),
      );
    }
    return posList;
  }

  /**
   * Special list combination function to combine a list of lists with a list, but not adding anything
   * when the list of paths is empty
   * @param pathList the list of paths inputted
   * @param posList the path to be added to the list of paths
   * @returns a combination of the two inputted lists
   */
  private _combineList(pathList: Pos[][], posList: Pos[]): Pos[][] {
    if (posList.length === 0) {
      return pathList;
    }
    pathList.push(posList);
    return pathList;
  }

  /**
   * Gets the moves in one direction for a piece at a given position
   * @param startPos the starting position of the piece
   * @param hoppedPieces the pieces that have already been hopped
   * @param isHop is the move part of a hop sequence?
   * @param currentMoveColor the color of the piece being moved
   * @param movePos the position one diagonal square away
   * @param hopPos the position two diagonal squares away
   * @param isKing is the piece that is hopping a king?
   * @returns a list of possible moves in the direction passed in
   */
  private _getMoveByDirection(
    startPos: Pos,
    hoppedPieces: Pos[],
    isHop: boolean,
    currentMoveColor: 'red' | 'black',
    movePos: Pos,
    hopPos: Pos,
    isKing: boolean,
  ): Pos[] {
    if (!isHop && this._isPosInBounds(movePos) && this._getPieceColorAtPos(movePos) === 'none') {
      return [movePos];
    }
    if (
      this._isPosInBounds(hopPos) &&
      this._isPosInBounds(movePos) &&
      this._getPieceColorAtPos(movePos) !== 'none' &&
      this._getPieceColorAtPos(movePos) !== currentMoveColor &&
      (this._getPieceColorAtPos(hopPos) === 'none' ||
        this._containsPos([[startPos]], hopPos) !== -1) &&
      this._containsPos([hoppedPieces], movePos) === -1
    ) {
      hoppedPieces.push(movePos);
      return [hopPos].concat(
        this._getHopPath(
          startPos,
          hopPos,
          currentMoveColor,
          this._checkIfKing(hopPos, currentMoveColor, isKing),
          hoppedPieces,
        ),
      );
    }
    return [];
  }

  /**
   * Function which recurses with getMoveByDirection to get the path of hops a piece can make from a position
   * @param startPos the starting position of the piece
   * @param piecePos the current position of the piece
   * @param currentMoveColor the color that is currently moving
   * @param isKing is this piece a king?
   * @param hoppedPieces the list of pieces already hopped by the piece
   * @returns a list of positions the piece can hop to
   */
  private _getHopPath(
    startPos: Pos,
    piecePos: Pos,
    currentMoveColor: 'red' | 'black',
    isKing: boolean,
    hoppedPieces: Pos[],
  ): Pos[] {
    let hopPath: Pos[] = [];

    const upLeftMove: Pos = { row: piecePos.row - 1, col: piecePos.col - 1 };
    const upLeftHop: Pos = { row: piecePos.row - 2, col: piecePos.col - 2 };

    const upRightMove: Pos = { row: piecePos.row - 1, col: piecePos.col + 1 };
    const upRightHop: Pos = { row: piecePos.row - 2, col: piecePos.col + 2 };

    const downLeftMove: Pos = { row: piecePos.row + 1, col: piecePos.col - 1 };
    const downLeftHop: Pos = { row: piecePos.row + 2, col: piecePos.col - 2 };

    const downRightMove: Pos = { row: piecePos.row + 1, col: piecePos.col + 1 };
    const downRightHop: Pos = { row: piecePos.row + 2, col: piecePos.col + 2 };

    if (isKing) {
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          upLeftMove,
          upLeftHop,
          true,
        ),
      );
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          upRightMove,
          upRightHop,
          true,
        ),
      );
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          downLeftMove,
          downLeftHop,
          true,
        ),
      );
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          downRightMove,
          downRightHop,
          true,
        ),
      );
    } else if (currentMoveColor === 'black') {
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          upLeftMove,
          upLeftHop,
          false,
        ),
      );
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          upRightMove,
          upRightHop,
          false,
        ),
      );
    } else if (currentMoveColor === 'red') {
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          downLeftMove,
          downLeftHop,
          false,
        ),
      );
      hopPath = hopPath.concat(
        this._getMoveByDirection(
          startPos,
          hoppedPieces,
          true,
          currentMoveColor,
          downRightMove,
          downRightHop,
          false,
        ),
      );
    }
    return hopPath;
  }

  /**
   * Is this position in bounds?
   * @param piecePos the position to be checked
   * @returns whether the position inputted is in bounds
   */
  private _isPosInBounds(piecePos: Pos): boolean {
    return piecePos.col >= 0 && piecePos.col <= 7 && piecePos.row >= 0 && piecePos.row <= 7;
  }

  /**
   * Gets the color of a piece at a certain position or none if there is no piece
   * @param piecePos the position to be checked
   * @returns the color of the piece at the given position or none if there is no piece
   */
  private _getPieceColorAtPos(piecePos: Pos): string {
    const tile = this.board[piecePos.row][piecePos.col];
    if (tile.piece == null) {
      return 'none';
    }
    return tile.piece.color;
  }

  /**
   * Checks to see if a piece has reached the end and become a king
   * @param piecePos the position of the piece to be checked
   * @param currentMoveColor the color of the piece to be checked
   * @returns whether or not a piece has promoted to a king
   */
  private _checkIfKing(piecePos: Pos, currentMoveColor: 'red' | 'black', isKing: boolean): boolean {
    if (isKing) {
      return true;
    }
    return (
      (piecePos.row === 0 && currentMoveColor === 'black') ||
      (piecePos.row === 7 && currentMoveColor === 'red')
    );
  }

  /**
   * Moves a piece from the start position to the end position and removes any pieces that were hopped to get there
   * @param startPos the starting position of the piece
   * @param endPos the ending position of the piece
   * @param playerColor the color of the piece to be moved
   */
  public movePiece(startPos: Pos, endPos: Pos, playerColor: 'red' | 'black') {
    const posMoves = this.precompute(playerColor)[startPos.row][startPos.col];
    const endPosCoords: number = this._containsPos(posMoves, endPos);
    if (this._isValidMove(startPos, endPos, posMoves)) {
      const hopPathLength: number = posMoves[endPosCoords].length;
      if (this._isHopMove(startPos, endPos)) {
        this._makeMove(startPos, endPos, playerColor, hopPathLength);
        this._removePiecesAtPos(
          this._getHoppedPieces(startPos, endPos, this._getLongestPathWithEndPos(posMoves, endPos)),
        );
        if (this._containsPos([[startPos]], endPos) === -1) {
          this._removePiecesAtPos([startPos]);
        }
      } else {
        this._makeMove(startPos, endPos, playerColor, 0);
        this._removePiecesAtPos([startPos]);
      }
    } else {
      throw new Error('Invalid Move!');
    }
  }

  /**
   * Gets the list of positions that is the longest path from the starting position to the ending position
   * @param posMoves the list of paths that the piece at the given position can move to
   * @param endPos the ending position the piece wants to go to
   * @returns the longest valid path from the starting position to the ending position
   */
  private _getLongestPathWithEndPos(posMoves: Pos[][], endPos: Pos): Pos[] {
    const endPosCoords: number = this._containsPos(posMoves, endPos);
    if (endPosCoords !== -1) {
      return this._parseForPathToEndPos(posMoves[endPosCoords], endPos);
    }
    return [];
  }

  /**
   * Get the path of a piece to the end position parsing through the full hop path
   * @param fullHopPath the full path that can be reached in the hop path (including forked moves)
   * @param endPos the ending position the piece wants to reach
   * @returns the path of positions to the ending position
   */
  private _parseForPathToEndPos(fullHopPath: Pos[], endPos: Pos): Pos[] {
    const pathToEndPos: Pos[] = [endPos];
    for (let i = fullHopPath.length - 1; i > 0; i--) {
      if (this._isValidPrecedingHop(fullHopPath[i], fullHopPath[i - 1], endPos, pathToEndPos)) {
        pathToEndPos.unshift(fullHopPath[i - 1]);
      }
    }
    return pathToEndPos;
  }

  /**
   * Checks to see if the previous position in the full hop path is a valid previous move
   * @param curPos the current position in the path to end position
   * @param prevPos the previous position in the full hop path
   * @param endPos the position the piece is trying to reach
   * @param pathToEndPos the path of positions to the ending position
   * @returns if the hop before the current one is a valid hop
   */
  private _isValidPrecedingHop(
    curPos: Pos,
    prevPos: Pos,
    endPos: Pos,
    pathToEndPos: Pos[],
  ): boolean {
    const hoppedPieceList: Pos[] = this._getHoppedPiecesFromList(pathToEndPos);
    const upLeftHop: Pos = { row: curPos.row - 2, col: curPos.col - 2 };
    const upRightHop: Pos = { row: curPos.row - 2, col: curPos.col + 2 };
    const downLeftHop: Pos = { row: curPos.row + 2, col: curPos.col - 2 };
    const downRightHop: Pos = { row: curPos.row + 2, col: curPos.col + 2 };
    const upLeftMove: Pos = { row: curPos.row - 1, col: curPos.col - 1 };
    const upRightMove: Pos = { row: curPos.row - 1, col: curPos.col + 1 };
    const downLeftMove: Pos = { row: curPos.row + 1, col: curPos.col - 1 };
    const downRightMove: Pos = { row: curPos.row + 1, col: curPos.col + 1 };

    const tile = this.board[endPos.row][endPos.col];
    if (tile.piece === null) {
      throw new Error('piece cannot be null');
    }

    if (tile.piece.isKing) {
      if (
        this._containsPos([[prevPos]], upLeftHop) !== -1 &&
        this._containsPos([hoppedPieceList], upLeftMove) === -1
      ) {
        return true;
      }
      if (
        this._containsPos([[prevPos]], upRightHop) !== -1 &&
        this._containsPos([hoppedPieceList], upRightMove) === -1
      ) {
        return true;
      }
      if (
        this._containsPos([[prevPos]], downLeftHop) !== -1 &&
        this._containsPos([hoppedPieceList], downLeftMove) === -1
      ) {
        return true;
      }
      if (
        this._containsPos([[prevPos]], downRightHop) !== -1 &&
        this._containsPos([hoppedPieceList], downRightMove) === -1
      ) {
        return true;
      }
    } else if (this._getPieceColorAtPos(endPos) === 'black') {
      if (
        this._containsPos([[prevPos]], downLeftHop) !== -1 &&
        this._containsPos([hoppedPieceList], downLeftMove) === -1
      ) {
        return true;
      }
      if (
        this._containsPos([[prevPos]], downRightHop) !== -1 &&
        this._containsPos([hoppedPieceList], downRightMove) === -1
      ) {
        return true;
      }
    } else if (this._getPieceColorAtPos(endPos) === 'red') {
      if (
        this._containsPos([[prevPos]], upLeftHop) !== -1 &&
        this._containsPos([hoppedPieceList], upLeftMove) === -1
      ) {
        return true;
      }
      if (
        this._containsPos([[prevPos]], upRightHop) !== -1 &&
        this._containsPos([hoppedPieceList], upRightMove) === -1
      ) {
        return true;
      }
    }
    return false;
  }

  /**
   * Moves the piece in the start position to the end position and converts it to a king if it has become a king
   * @param startPos the starting position of the piece to be moved
   * @param endPos the ending position of the piece to be moved
   * @param playerColor the color of the piece to be moved
   * @param hopPathLength the number of hops in the full hop path (includes forks in the path) to reach the end position
   */
  private _makeMove(
    startPos: Pos,
    endPos: Pos,
    playerColor: 'red' | 'black',
    hopPathLength: number,
  ) {
    if (this._pieceBecomesKing(startPos, endPos, playerColor, hopPathLength)) {
      const pieceToMove: CheckerPiece = { color: playerColor, isKing: true };
      this.board[endPos.row][endPos.col].piece = pieceToMove;
    } else {
      const pieceToMove = this.board[startPos.row][startPos.col].piece;
      this.board[endPos.row][endPos.col].piece = pieceToMove;
    }
  }

  /**
   * Checks if a piece becomes a king based on whether or not it ends in the last row, if it moved behind it's current position
   * or if the full hop path is of a certain length and meets a certain condition (these conditions guarantee with only
   * the start, end positions as well as full hop path length that the piece is a king).
   * @param startPos the starting position of the piece
   * @param endPos the ending position of the piece
   * @param playerColor the color of the piece to be moved
   * @param hopPathLength the number of hops in the full hop path (including forked paths)
   * @returns whether or not a piece should become a king
   */
  private _pieceBecomesKing(
    startPos: Pos,
    endPos: Pos,
    playerColor: 'red' | 'black',
    hopPathLength: number,
  ): boolean {
    if (playerColor === 'black') {
      return (
        endPos.row === 0 ||
        endPos.row >= startPos.row ||
        (hopPathLength >= 5 && startPos.row % 2 === 0) ||
        (hopPathLength === 4 && Math.abs(endPos.row - startPos.row) <= 4) ||
        (hopPathLength === 3 && startPos.row === 4)
      );
    }
    return (
      endPos.row === 7 ||
      endPos.row <= startPos.row ||
      (hopPathLength >= 5 && startPos.row % 2 === 1) ||
      (hopPathLength === 4 && Math.abs(endPos.row - startPos.row) <= 4) ||
      (hopPathLength === 3 && startPos.row === 3)
    );
  }

  /**
   * Whether or not a move to be made is a valid move.
   * @param startPos the starting position of the piece to be moved
   * @param endPos the ending position of the piece to be moved
   * @param posMoves the list of paths that the piece to be moved can take
   * @returns if the move to be made is valid
   */
  private _isValidMove(startPos: Pos, endPos: Pos, posMoves: Pos[][]): boolean {
    return (
      this._isPosInBounds(startPos) &&
      this._isPosInBounds(endPos) &&
      this._containsPos(posMoves, endPos) !== -1
    );
  }

  /**
   * Checks to see if a position is inside a list of paths, giving -1 if the position is not in the list of paths,
   * or the index of the longest path containing the position
   * @param posMoves the list of paths a piece can take
   * @param destinationPos the position to be checked
   * @returns whether or not a list of paths has a position, and the longest path that has the position.
   */
  private _containsPos(posMoves: Pos[][], destinationPos: Pos): number {
    let returnIdx = -1;
    let posMovesLength = 0;
    for (let i = 0; i < posMoves.length; i++) {
      for (let j = 0; j < posMoves[i].length; j++) {
        if (
          posMoves[i][j].row === destinationPos.row &&
          posMoves[i][j].col === destinationPos.col &&
          posMoves[i].length > posMovesLength
        ) {
          returnIdx = i;
          posMovesLength = posMoves[i].length;
        }
      }
    }
    return returnIdx;
  }

  /**
   * Removes all the pieces in the list of positions and decrements the piece counts accordingly
   * @param piecePosList the list of pieces to be removed.
   */
  private _removePiecesAtPos(piecePosList: Pos[]) {
    for (let i = 0; i < piecePosList.length; i++) {
      if (this._isPosInBounds(piecePosList[i])) {
        if (this._getPieceColorAtPos(piecePosList[i]) === 'black') {
          this._blackPieceCount--;
        } else if (this._getPieceColorAtPos(piecePosList[i]) === 'red') {
          this._redPieceCount--;
        }
        this.board[piecePosList[i].row][piecePosList[i].col].piece = null;
      }
    }
  }

  /**
   * Whehter or not a move is a hop move or not
   * @param startPos the starting position of the piece
   * @param endPos the ending position of the piece
   * @returns whether or not a move is a hop move
   */
  private _isHopMove(startPos: Pos, endPos: Pos): boolean {
    return (
      Math.abs(startPos.row - endPos.row) + Math.abs(startPos.col - endPos.col) > 2 ||
      this._containsPos([[startPos]], endPos) !== -1
    );
  }

  /**
   * Gives a list of positions of all of the pieces that were hopped for the piece to be moved to reach its ending position
   * @param startPos the starting position of the piece to be moved
   * @param endPos the ending position of the piece to be moved
   * @param hopPath the list of hops the piece made to reach the ending posistion
   * @returns a list of positions containing the positions of the hopped pieces to reach the end pos of the piece to be moved
   */
  private _getHoppedPieces(startPos: Pos, endPos: Pos, hopPath: Pos[]): Pos[] {
    if (hopPath.length === 0) {
      return this._getMiddleHop(startPos, endPos);
    }
    const hoppedPiecePath: Pos[] = this._getMiddleHop(startPos, hopPath[0]);
    const list = hoppedPiecePath.concat(this._getHoppedPiecesFromList(hopPath));
    return hoppedPiecePath.concat(this._getHoppedPiecesFromList(hopPath));
  }

  private _getHoppedPiecesFromList(pathToEndPos: Pos[]): Pos[] {
    const hoppedPieceList: Pos[] = [];
    for (let i = 1; i < pathToEndPos.length; i++) {
      hoppedPieceList.push(this._getMiddleHop(pathToEndPos[i - 1], pathToEndPos[i])[0]);
    }
    return hoppedPieceList;
  }

  /**
   * Get's the middle position of 2 positions to find the pos of a piece that got hopped from
   * where the piece to be moved started and hopped.
   * @param startPos the initial position
   * @param endPos the ending position
   * @returns the middle pos of 2 positions
   */
  private _getMiddleHop(startPos: Pos, endPos: Pos): Pos[] {
    const midRow = (startPos.row + endPos.row) / 2;
    const midCol = (startPos.col + endPos.col) / 2;
    const midPos: Pos = { row: midRow, col: midCol };
    return [midPos];
  }

  /**
   * Returns the color of the player that has won, or none if no has won
   * @returns the color of the winner or none if no one has won.
   */
  public isGameOver(): 'red' | 'black' | 'none' {
    this._blackPieceCount = this._countNumPieces('black');
    this._redPieceCount = this._countNumPieces('red');
    if (this._blackPieceCount === 0) {
      return 'red';
    }
    if (this._redPieceCount === 0) {
      return 'black';
    }
    return 'none';
  }

  public toModel() {
    return {
      board: this.board,
    };
  }
}

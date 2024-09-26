import EventEmitter from 'events';
import TypedEmitter from 'typed-emitter';
import PlayerController from './PlayerController';
import _ from 'lodash';

import {
  CheckerBoard,
  CheckerPiece,
  CheckerTile,
  CheckersArea as CheckersAreaModel,
  Pos,
} from '../types/CoveyTownSocket';
import { useState, useEffect } from 'react';
/**
 * The events that the CheckersAreaController emits to subscribers. These events
 * are only ever emmitted to local components (not to the townservice).
 */
export type CheckerAreaEvents = {
  // Occupants enters or leaves the area.
  occupantsChange: (newOccupants: PlayerController[]) => void;

  // Player begins or ends viewing/playing the game.
  playerOneChange: (newPlayerOne: string | undefined) => void;
  playerTwoChange: (newPlayerTwo: string | undefined) => void;

  // Player begins or ends viewing/playing the game.
  boardChange: (newBoard: CheckerBoard) => void;

  // Send an update that a players turn has finished.
  turnChange: (newTurn: boolean) => void;

  // Send an update that the game is over.
  gameOver: (winnerID: string | undefined) => void;

  // send an update about a new precompute board
  preBoardChange: (newPreBoard: Pos[][][][]) => void;
};

/**
 * A CheckersAreaController manages the local behavior of a checkers area in the front end,
 * implementing the logic to bridge between the townService's interpretation of checkers areas and the
 * frontend's. The CheckersAreaController emits events when the checkers area changes.
 */
export default class CheckersAreaController extends (EventEmitter as new () => TypedEmitter<CheckerAreaEvents>) {
  private readonly _id: string;

  private _occupants: PlayerController[] = [];

  private _playerOneID: string | undefined;

  private _playerTwoID: string | undefined;

  private _isPlayerOneTurn = false; // playerOne is red

  private _currentModel: CheckersAreaModel;

  private _winnerID: string | undefined;

  /**
   * Creates a new CheckersAreaController
   * @param checkerBoardModel
   */
  constructor(checkerBoardModel: CheckersAreaModel) {
    super();
    this._id = checkerBoardModel.id;
    this._currentModel = checkerBoardModel;
  }

  /**
   * The id of this checkers area (read only)
   */
  get id() {
    return this._id;
  }

  /**
   * The model of the underlying checkers board
   */
  get currentModel() {
    return this._currentModel;
  }

  /**
   * The checker board
   */
  get board() {
    return this._currentModel.board;
  }

  /**
   * Sets to a new checker board
   */
  set board(newBoard: CheckerBoard) {
    if (newBoard) {
      this.emit('boardChange', newBoard);
    }
    this._currentModel.board = newBoard;
  }

  get preBoard() {
    return this.currentModel.preBoard;
  }

  set preBoard(newPreBoard: Pos[][][][]) {
    if (newPreBoard) {
      this.emit('preBoardChange', newPreBoard);
    }
    this._currentModel.preBoard = newPreBoard;
  }

  /**
   * The list of occupants in the checkers area.
   */
  get occupants() {
    return this._occupants;
  }

  /**
   * The list of occupants in this checkers area. Changing the set of occupants
   * will emit an occupantsChange event.
   */
  set occupants(newOccupants: PlayerController[]) {
    if (
      newOccupants.length !== this._occupants.length ||
      _.xor(newOccupants, this._occupants).length > 0
    ) {
      this._occupants = newOccupants;
      this.emit('occupantsChange', newOccupants);
    }
  }

  /**
   * The ID of player one, competing in the checkers game.
   */
  get playerOneID() {
    return this._playerOneID;
  }

  /**
   * Set the id of player one
   */
  set playerOneID(newPlayer: string | undefined) {
    if ((newPlayer !== this._playerOneID && newPlayer !== this._playerTwoID) || !newPlayer) {
      this.emit('playerOneChange', newPlayer);
    }
    this._playerOneID = newPlayer;
  }

  /**
   * The ID of the second player competing.
   */
  get playerTwoID() {
    return this._playerTwoID;
  }

  /**
   * Set the id of player two
   */
  set playerTwoID(newPlayer: string | undefined) {
    if ((newPlayer !== this._playerTwoID && newPlayer !== this._playerOneID) || !newPlayer) {
      this.emit('playerTwoChange', newPlayer);
    }
    this._playerTwoID = newPlayer;
  }

  /**
   * The ID of the second player competing.
   */
  get winnerID() {
    return this._winnerID;
  }

  /**
   * Set the id of the winning player
   */
  set winnerID(newPlayer: string | undefined) {
    if (newPlayer !== this._winnerID) {
      this.emit('gameOver', newPlayer);
    }
    this._winnerID = newPlayer;
  }

  /**
   * Track who's turn it is.
   */
  get isPlayerOneTurn() {
    return this._isPlayerOneTurn;
  }

  /**
   * Set whether it is playerOne's turn
   */
  set isPlayerOneTurn(newTurn: boolean) {
    if (newTurn !== this._isPlayerOneTurn) {
      this._isPlayerOneTurn = newTurn;
      this.emit('turnChange', newTurn);
    }
    this._isPlayerOneTurn = newTurn;
  }

  /**
   * Initializes a new checkers board
   * @returns returns the new checkers board
   */
  private _makeNewBoard(): CheckerTile[][] {
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
   * Resets the checkers area controller
   */
  public resetGame(): void {
    const returnBoard: CheckerTile[][] = this._makeNewBoard();
    const newBoard: CheckerBoard = {
      board: returnBoard,
    };

    const possibleMovesForBlack = [
      [[], [], [], [], [], [], [], []],
      [[], [], [], [], [], [], [], []],
      [[], [], [], [], [], [], [], []],
      [[], [], [], [], [], [], [], []],
      [[], [], [], [], [], [], [], []],
      [
        [[{ row: 4, col: 1 }]],
        [],
        [[{ row: 4, col: 1 }], [{ row: 4, col: 3 }]],
        [],
        [[{ row: 4, col: 3 }], [{ row: 4, col: 5 }]],
        [],
        [[{ row: 4, col: 5 }], [{ row: 4, col: 7 }]],
        [],
      ],
      [[], [], [], [], [], [], [], []],
      [[], [], [], [], [], [], [], []],
    ];

    this.updateFrom({
      board: newBoard,
      isPlayerOneTurn: false,
      winnerID: undefined,
      playerOneID: undefined,
      playerTwoID: undefined,
      id: this.currentModel.id,
      preBoard: possibleMovesForBlack,
    });
  }

  /**
   * Count how many pieces exist on the board of a given color.
   * @param color color of pieces to count
   * @returns count of pieces on board matching given color
   */
  public getPieceCounts(color: string): number {
    let pieceCount = 0;
    for (let i = 0; i < 8; i++) {
      for (let j = 0; j < 8; j++) {
        if (this._currentModel.board.board[i][j].piece?.color === color) {
          pieceCount += 1;
        }
      }
    }
    return pieceCount;
  }

  /**
   * Applies updates to this viewing area controller's model, setting the fields
   * isPlaying, elapsedTimeSec and video from the updatedModel
   *
   * @param updatedModel
   */
  public updateFrom(updatedModel: CheckersAreaModel): void {
    this.board = updatedModel.board;
    this.playerOneID = updatedModel.playerOneID;
    this.playerTwoID = updatedModel.playerTwoID;
    this.winnerID = updatedModel.winnerID;
    this.isPlayerOneTurn = updatedModel.isPlayerOneTurn;
    this.preBoard = updatedModel.preBoard;
  }

  /**
   * Return a representation of this CheckersAreaController that matches
   * the townService's representation and is suitable for transmitting over the network.
   */
  toCheckersAreaModel(): CheckersAreaModel {
    return {
      id: this._id,
      board: this._currentModel.board,
      playerOneID: this._playerOneID,
      playerTwoID: this._playerTwoID,
      winnerID: this._winnerID,
      isPlayerOneTurn: this._isPlayerOneTurn,
      preBoard: this._currentModel.preBoard,
    };
  }
}

/**
 * A hook that returns the number of stars for the poster session area with the given controller
 */
export function useBoard(controller: CheckersAreaController): CheckerTile[][] {
  const [board, setBoard] = useState(controller.board);
  useEffect(() => {
    controller.addListener('boardChange', setBoard);
    return () => {
      controller.removeListener('boardChange', setBoard);
    };
  }, [controller]);
  return board.board;
}

/**
 * A hook that returns the number of stars for the poster session area with the given controller
 */
export function useCurrentTurn(controller: CheckersAreaController): 'red' | 'black' {
  const [p1Turn, setp1Turn] = useState(controller.isPlayerOneTurn);
  useEffect(() => {
    controller.addListener('turnChange', setp1Turn);
    return () => {
      controller.removeListener('turnChange', setp1Turn);
    };
  }, [controller]);
  return p1Turn ? 'red' : 'black';
}

/**
 * A hook that returns the ID of player one.
 */
export function usePlayerOneID(area: CheckersAreaController): string | undefined {
  const [playerOne, setPlayerOne] = useState(area.playerOneID);
  useEffect(() => {
    area.addListener('playerOneChange', setPlayerOne);
    return () => {
      area.removeListener('playerOneChange', setPlayerOne);
    };
  }, [area, setPlayerOne]);
  return playerOne;
}

/**
 * A hook that returns the ID of player two.
 */
export function usePlayerTwoID(area: CheckersAreaController): string | undefined {
  const [playerTwo, setPlayerTwo] = useState(area.playerTwoID);
  useEffect(() => {
    area.addListener('playerTwoChange', setPlayerTwo);
    return () => {
      area.removeListener('playerTwoChange', setPlayerTwo);
    };
  }, [area, setPlayerTwo]);
  return playerTwo;
}

/**
 * A hook that returns the ID of player who won.
 */
export function useWinnerID(area: CheckersAreaController): string | undefined {
  const [winnerID, setWinnerID] = useState(area.winnerID);
  useEffect(() => {
    area.addListener('gameOver', setWinnerID);
    return () => {
      area.removeListener('gameOver', setWinnerID);
    };
  }, [area, setWinnerID]);
  return winnerID;
}

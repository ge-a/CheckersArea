import { ITiledMapObject } from '@jonbell/tiled-map-type-guard';
import CheckerBoard from '../lib/CheckerBoard';
import {
  BoundingBox,
  TownEmitter,
  CheckersArea as CheckersAreaModel,
  CheckerBoard as CheckerBoardType,
  Pos,
} from '../types/CoveyTownSocket';
import InteractableArea from './InteractableArea';

export default class CheckersArea extends InteractableArea {
  private _playerOneID: string | undefined;

  private _playerTwoID: string | undefined;

  private _isPlayerOneTurn: boolean;

  private _board: CheckerBoardType;

  public get playerOneID() {
    return this._playerOneID;
  }

  public get playerTwoID() {
    return this._playerTwoID;
  }

  public get isPlayerOneTurn() {
    return this._isPlayerOneTurn;
  }

  public get board() {
    return this._board;
  }

  /**
   * Creates a new CheckersArea
   * @param CheckersAreaModel model containing the areas checkers board member variables
   * @param coordinates the bounding box that defines this checkers area
   * @param townEmitter a broadcast emitter that can be used to emit updates to players
   */
  public constructor(
    { id, board, playerOneID, playerTwoID, isPlayerOneTurn }: CheckersAreaModel,
    coordinates: BoundingBox,
    townEmitter: TownEmitter,
  ) {
    super(id, coordinates, townEmitter);
    this._board = board;
    this._playerOneID = playerOneID;
    this._playerTwoID = playerTwoID;
    this._isPlayerOneTurn = isPlayerOneTurn;
  }

  /**
   * Updates the state of this CheckersArea, setting the board,players, and turn
   * @param checkersArea updated model
   */
  public updateModel({ board, playerOneID, playerTwoID, isPlayerOneTurn }: CheckersAreaModel) {
    this._board = board;
    this._playerOneID = playerOneID;
    this._playerTwoID = playerTwoID;
    this._isPlayerOneTurn = isPlayerOneTurn;
  }

  /**
   * Convert this CheckersArea instance to a simple CheckersAreaModel suitable for
   * transporting over a socket to a client.
   */
  public toModel(): CheckersAreaModel {
    return {
      id: this.id,
      board: this._board,
      playerOneID: this._playerOneID,
      playerTwoID: this._playerOneID,
      isPlayerOneTurn: this._isPlayerOneTurn,
      preBoard: new CheckerBoard(this.board).precompute(this.isPlayerOneTurn ? 'black' : 'red'),
    };
  }

  /**
   * Creates a new CheckersArea object that will represent a Checkers Area object in the town map.
   * @param mapObject An ITiledMapObject that represents a rectangle in which this checkers area exists
   * @param broadcastEmitter An emitter that can be used by this checkers area to broadcast updates
   * @returns
   */
  public static fromMapObject(mapObject: ITiledMapObject, townEmitter: TownEmitter): CheckersArea {
    const { name, width, height } = mapObject;
    if (!width || !height) {
      throw new Error(`Malformed checkers area ${name}`);
    }
    const rect: BoundingBox = { x: mapObject.x, y: mapObject.y, width, height };
    return new CheckersArea(
      {
        id: name,
        board: new CheckerBoard(null),
        playerOneID: undefined,
        playerTwoID: undefined,
        isPlayerOneTurn: true,
        preBoard: new CheckerBoard(null).precompute('black'),
      },
      rect,
      townEmitter,
    );
  }
}

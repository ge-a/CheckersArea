import assert from 'assert';
import {
  Body,
  Controller,
  Delete,
  Example,
  Get,
  Header,
  Patch,
  Path,
  Post,
  Response,
  Route,
  Tags,
} from 'tsoa';

import { Town, TownCreateParams, TownCreateResponse } from '../api/Model';
import InvalidParametersError from '../lib/InvalidParametersError';
import CoveyTownsStore from '../lib/TownsStore';
import {
  ConversationArea,
  CoveyTownSocket,
  TownSettingsUpdate,
  ViewingArea,
  PosterSessionArea,
  CheckersArea,
  Pos,
  CheckerTile,
  CheckerBoardModel as CheckerBoardModelBE,
  GameOverWrapper,
  CheckerMove,
  GameRecord,
} from '../types/CoveyTownSocket';
import CheckerBoard from '../lib/CheckerBoard';
import PosterSessionAreaReal from './PosterSessionArea';
import { isCheckersArea, isPosterSessionArea } from '../TestUtils';
import { getRecords, postGameRecord } from '../lib/LeaderBoard';
import { log } from '../Utils';

/**
 * This is the town route
 */
@Route('towns')
@Tags('towns')
// TSOA (which we use to generate the REST API from this file) does not support default exports, so the controller can't be a default export.
// eslint-disable-next-line import/prefer-default-export
export class TownsController extends Controller {
  private _townsStore: CoveyTownsStore = CoveyTownsStore.getInstance();

  /**
   * List all towns that are set to be publicly available
   *
   * @returns list of towns
   */
  @Get()
  public async listTowns(): Promise<Town[]> {
    return this._townsStore.getTowns();
  }

  /**
   * Create a new town
   *
   * @param request The public-facing information for the new town
   * @example request {"friendlyName": "My testing town public name", "isPubliclyListed": true}
   * @returns The ID of the newly created town, and a secret password that will be needed to update or delete this town.
   */
  @Example<TownCreateResponse>({ townID: 'stringID', townUpdatePassword: 'secretPassword' })
  @Post()
  public async createTown(@Body() request: TownCreateParams): Promise<TownCreateResponse> {
    const { townID, townUpdatePassword } = await this._townsStore.createTown(
      request.friendlyName,
      request.isPubliclyListed,
      request.mapFile,
    );
    return {
      townID,
      townUpdatePassword,
    };
  }

  /**
   * Updates an existing town's settings by ID
   *
   * @param townID  town to update
   * @param townUpdatePassword  town update password, must match the password returned by createTown
   * @param requestBody The updated settings
   */
  @Patch('{townID}')
  @Response<InvalidParametersError>(400, 'Invalid password or update values specified')
  public async updateTown(
    @Path() townID: string,
    @Header('X-CoveyTown-Password') townUpdatePassword: string,
    @Body() requestBody: TownSettingsUpdate,
  ): Promise<void> {
    const success = this._townsStore.updateTown(
      townID,
      townUpdatePassword,
      requestBody.friendlyName,
      requestBody.isPubliclyListed,
    );
    if (!success) {
      throw new InvalidParametersError('Invalid password or update values specified');
    }
  }

  /**
   * Deletes a town
   * @param townID ID of the town to delete
   * @param townUpdatePassword town update password, must match the password returned by createTown
   */
  @Delete('{townID}')
  @Response<InvalidParametersError>(400, 'Invalid password or update values specified')
  public async deleteTown(
    @Path() townID: string,
    @Header('X-CoveyTown-Password') townUpdatePassword: string,
  ): Promise<void> {
    const success = this._townsStore.deleteTown(townID, townUpdatePassword);
    if (!success) {
      throw new InvalidParametersError('Invalid password or update values specified');
    }
  }

  /**
   * Creates a conversation area in a given town
   * @param townID ID of the town in which to create the new conversation area
   * @param sessionToken session token of the player making the request, must match the session token returned when the player joined the town
   * @param requestBody The new conversation area to create
   */
  @Post('{townID}/conversationArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createConversationArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: ConversationArea,
  ): Promise<void> {
    const town = this._townsStore.getTownByID(townID);
    if (!town?.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid values specified');
    }
    const success = town.addConversationArea(requestBody);
    if (!success) {
      throw new InvalidParametersError('Invalid values specified');
    }
  }

  /**
   * Creates a viewing area in a given town
   *
   * @param townID ID of the town in which to create the new viewing area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The new viewing area to create
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          viewing area could not be created
   */
  @Post('{townID}/viewingArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createViewingArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: ViewingArea,
  ): Promise<void> {
    const town = this._townsStore.getTownByID(townID);
    if (!town) {
      throw new InvalidParametersError('Invalid values specified');
    }
    if (!town?.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid values specified');
    }
    const success = town.addViewingArea(requestBody);
    if (!success) {
      throw new InvalidParametersError('Invalid values specified');
    }
  }

  /**
   * Creates a checkers area in a given town
   *
   * @param townID ID of the town in which to create the new checkers area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The new checkers area to create
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          checkers area could not be created
   */

  @Post('{townID}/checkersArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createCheckersArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: CheckersArea,
  ): Promise<void> {
    const town = this._townsStore.getTownByID(townID);
    if (!town) {
      throw new InvalidParametersError('Invalid values specified');
    }
    if (!town?.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid values specified');
    }
    const success = town.addCheckersArea(requestBody);
    if (!success) {
      throw new InvalidParametersError('Invalid values specified');
    }
  }

  /**
   * Gets the current players of the checker area of this town
   *
   * @param townID ID of the town in which to get the checkers area players
   * @param checkersAreaID interactable ID of the checkers area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          checkers area specified does not exist
   */
  @Patch('{townID}/{checkersAreaID}/checkersPlayers')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getCheckersAreaPlayers(
    @Path() townID: string,
    @Path() checkersAreaID: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<(string | undefined)[]> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid checkersArea ID');
    }
    const checkersArea = curTown.getInteractable(checkersAreaID);

    if (!checkersArea || !isCheckersArea(checkersArea)) {
      throw new InvalidParametersError('Invalid checkers session ID');
    }
    return [checkersArea.playerOneID, checkersArea.playerTwoID];
  }

  /**
   * Gets the player who has won the game of checkers, or undefined of the checker area of this town
   *
   * @param townID ID of the town in which to get the checkers area players
   * @param checkersAreaID interactable ID of the checkers area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The checker board
   * @returns the player (or undefined if no one has won) that has won
   */
  @Post('{townID}/{checkersAreaID}/checkersWinner')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getCheckersAreaWinner(
    @Path() townID: string,
    @Path() checkersAreaID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: GameOverWrapper,
  ): Promise<string | undefined> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid sessionToken');
    }
    const checkersArea = curTown.getInteractable(checkersAreaID);

    if (!checkersArea || !isCheckersArea(checkersArea)) {
      throw new InvalidParametersError('Invalid checkers session ID');
    }
    if (!checkersArea.playerOneID) {
      throw new InvalidParametersError('Missing Player1');
    }
    if (!checkersArea.playerTwoID) {
      throw new InvalidParametersError('Missing Players2');
    }

    let winnerId;

    // in the resign player case
    if (requestBody.resignedPlayer) {
      winnerId =
        requestBody.resignedPlayer === checkersArea.playerOneID
          ? checkersArea.playerTwoID
          : checkersArea.playerOneID;
    } else {
      // checking if game over
      const model: CheckerBoardModelBE = {
        board: requestBody.board,
      };

      const board = new CheckerBoard(model);

      if (board.isGameOver() === 'black') {
        winnerId = checkersArea.playerTwoID;
      }
      if (board.isGameOver() === 'red') {
        winnerId = checkersArea.playerOneID;
      }
    }

    // post database record
    if (winnerId && !requestBody.testing) {
      postGameRecord(checkersArea.playerOneID, checkersArea.playerTwoID, winnerId);
    }

    return winnerId;
  }

  /**
   * Gets the player who has won the game of checkers, or undefined of the checker area of this town
   *
   * @param townID ID of the town in which to get the checkers area players
   * @param checkersAreaID interactable ID of the checkers area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @returns the player (or undefined if no one has won) that has won
   */
  @Get('{townID}/{checkersAreaID}/getLeaderBoard')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getLeaderBoard(
    @Path() townID: string,
    @Path() checkersAreaID: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<GameRecord[]> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid checkersArea ID');
    }
    const checkersArea = curTown.getInteractable(checkersAreaID);

    if (!checkersArea || !isCheckersArea(checkersArea)) {
      throw new InvalidParametersError('Invalid checkers session ID');
    }
    if (!checkersArea.playerOneID) {
      throw new InvalidParametersError('Missing Player1');
    }
    if (!checkersArea.playerTwoID) {
      throw new InvalidParametersError('Missing Players2');
    }

    const playerRecords = getRecords([checkersArea.playerOneID, checkersArea.playerTwoID]);
    return playerRecords;
  }

  /**
   * Creates a poster session area in a given town
   *
   * @param townID ID of the town in which to create the new poster session area
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The new poster session area to create
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          poster session area could not be created
   */
  @Post('{townID}/posterSessionArea')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async createPosterSessionArea(
    @Path() townID: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: PosterSessionArea,
  ): Promise<void> {
    // download file here TODO
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    // add viewing area to the town, throw error if it fails
    if (!curTown.addPosterSessionArea(requestBody)) {
      throw new InvalidParametersError('Invalid poster session area');
    }
  }

  /**
   * Gets the image contents of a given poster session area in a given town
   *
   * @param townID ID of the town in which to get the poster session area image contents
   * @param posterSessionId interactable ID of the poster session
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          poster session specified does not exist
   */
  @Patch('{townID}/{posterSessionId}/imageContents')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getPosterAreaImageContents(
    @Path() townID: string,
    @Path() posterSessionId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<string | undefined> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const posterSessionArea = curTown.getInteractable(posterSessionId);
    if (!posterSessionArea || !isPosterSessionArea(posterSessionArea)) {
      throw new InvalidParametersError('Invalid poster session ID');
    }
    return posterSessionArea.imageContents;
  }

  /**
   * Increment the stars of a given poster session area in a given town, as long as there is
   * a poster image. Returns the new number of stars.
   *
   * @param townID ID of the town in which to get the poster session area image contents
   * @param posterSessionId interactable ID of the poster session
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   *
   * @throws InvalidParametersError if the session token is not valid, or if the
   *          poster session specified does not exist, or if the poster session specified
   *          does not have an image
   */
  @Patch('{townID}/{posterSessionId}/incStars')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async incrementPosterAreaStars(
    @Path() townID: string,
    @Path() posterSessionId: string,
    @Header('X-Session-Token') sessionToken: string,
  ): Promise<number> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const posterSessionArea = curTown.getInteractable(posterSessionId);
    if (!posterSessionArea || !isPosterSessionArea(posterSessionArea)) {
      throw new InvalidParametersError('Invalid poster session ID');
    }
    if (!posterSessionArea.imageContents) {
      throw new InvalidParametersError('Cant star a poster with no image');
    }
    const newStars = posterSessionArea.stars + 1;
    const updatedPosterSessionArea = {
      id: posterSessionArea.id,
      imageContents: posterSessionArea.imageContents,
      title: posterSessionArea.title,
      stars: newStars, // increment stars
    };
    (<PosterSessionAreaReal>posterSessionArea).updateModel(updatedPosterSessionArea);
    return newStars;
  }

  /**
   *
   * @param townID ID of the town in which to get the poster session area image contents
   * @param currentPlayer The current player ('red' or 'black')
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The checker board
   * @returns Current player's possible paths
   */
  @Post('{townID}/checkerBoardMoves/{currentPlayer}')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async getCheckerBoardPossibleMoves(
    @Path() townID: string,
    @Path() currentPlayer: 'red' | 'black',
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: CheckerTile[][],
  ): Promise<Pos[][][][]> {
    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    if (!curTown.getPlayerBySessionToken(sessionToken)) {
      throw new InvalidParametersError('Invalid session ID');
    }
    const model: CheckerBoardModelBE = {
      board: requestBody,
    };
    const board = new CheckerBoard(model);

    return board.precompute(currentPlayer);
  }

  /**
   *
   * @param townID ID of the town in which to get the poster session area image contents
   * @param currentPlayer The current player ('red' or 'black')
   * @param sessionToken session token of the player making the request, must
   *        match the session token returned when the player joined the town
   * @param requestBody The checker board
   * @returns Current player's possible paths
   */
  @Post('{townID}/{checkersAreaId}/checkerBoardMovePiece')
  @Response<InvalidParametersError>(400, 'Invalid values specified')
  public async postPieceMove(
    @Path() townID: string,
    @Path() checkersAreaId: string,
    @Header('X-Session-Token') sessionToken: string,
    @Body() requestBody: CheckerMove,
  ): Promise<CheckersArea> {
    const model: CheckerBoardModelBE = {
      board: requestBody.board,
    };
    const board = new CheckerBoard(model);
    const { currPlayer } = requestBody;

    if (currPlayer !== 'red' && currPlayer !== 'black') {
      throw new InvalidParametersError('Invalid curr player');
    }
    board.movePiece(requestBody.source, requestBody.dest, currPlayer as 'red' | 'black');
    const winner = board.isGameOver();

    const nextTurn = requestBody.currPlayer === 'red' ? 'black' : 'red';
    const preBoard = board.precompute(nextTurn);

    const curTown = this._townsStore.getTownByID(townID);
    if (!curTown) {
      throw new InvalidParametersError('Invalid town ID');
    }
    const curCheckersArea = curTown.getInteractable(checkersAreaId);
    if (!curCheckersArea || !isCheckersArea(curCheckersArea)) {
      throw new InvalidParametersError('Invalid checkers area ID');
    }
    const returnModel: CheckersArea = {
      id: checkersAreaId,
      board,
      isPlayerOneTurn: nextTurn === 'red',
      playerOneID: curCheckersArea.playerOneID,
      playerTwoID: curCheckersArea.playerTwoID,
      preBoard,
    };
    if (winner === 'red') {
      returnModel.winnerID = curCheckersArea.playerOneID;
    } else if (winner === 'black') {
      returnModel.winnerID = curCheckersArea.playerTwoID;
    }
    if (
      winner !== 'none' &&
      curCheckersArea.playerOneID &&
      curCheckersArea.playerTwoID &&
      returnModel.winnerID
    ) {
      postGameRecord(
        curCheckersArea.playerOneID,
        curCheckersArea.playerTwoID,
        returnModel.winnerID,
      );
    }
    return returnModel;
  }

  /**
   * Connects a client's socket to the requested town, or disconnects the socket if no such town exists
   *
   * @param socket A new socket connection, with the userName and townID parameters of the socket's
   * auth object configured with the desired townID to join and username to use
   *
   */
  public async joinTown(socket: CoveyTownSocket) {
    // Parse the client's requested username from the connection
    const { userName, townID } = socket.handshake.auth as { userName: string; townID: string };

    const town = this._townsStore.getTownByID(townID);
    if (!town) {
      socket.disconnect(true);
      return;
    }

    // Connect the client to the socket.io broadcast room for this town
    socket.join(town.townID);

    const newPlayer = await town.addPlayer(userName, socket);
    assert(newPlayer.videoToken);
    socket.emit('initialize', {
      userID: newPlayer.id,
      sessionToken: newPlayer.sessionToken,
      providerVideoToken: newPlayer.videoToken,
      currentPlayers: town.players.map(eachPlayer => eachPlayer.toPlayerModel()),
      friendlyName: town.friendlyName,
      isPubliclyListed: town.isPubliclyListed,
      interactables: town.interactables.map(eachInteractable => eachInteractable.toModel()),
    });
  }
}

import { ITiledMap, ITiledMapObjectLayer } from '@jonbell/tiled-map-type-guard';
import { nanoid } from 'nanoid';
import { BroadcastOperator } from 'socket.io';
import IVideoClient from '../lib/IVideoClient';
import Player from '../lib/Player';
import TwilioVideo from '../lib/TwilioVideo';
import { isPosterSessionArea, isViewingArea, isCheckersArea } from '../TestUtils';
import {
  ChatMessage,
  ConversationArea as ConversationAreaModel,
  CoveyTownSocket,
  Interactable,
  PlayerLocation,
  ServerToClientEvents,
  SocketData,
  ViewingArea as ViewingAreaModel,
  PosterSessionArea as PosterSessionAreaModel,
  CheckersArea as CheckersAreaModel,
} from '../types/CoveyTownSocket';
import ConversationArea from './ConversationArea';
import InteractableArea from './InteractableArea';
import ViewingArea from './ViewingArea';
import PosterSessionArea from './PosterSessionArea';
import CheckersArea from './CheckersArea';

/**
 * The Town class implements the logic for each town: managing the various events that
 * can occur (e.g. joining a town, moving, leaving a town)
 */
export default class Town {
  get capacity(): number {
    return this._capacity;
  }

  set isPubliclyListed(value: boolean) {
    this._isPubliclyListed = value;
    this._broadcastEmitter.emit('townSettingsUpdated', { isPubliclyListed: value });
  }

  get isPubliclyListed(): boolean {
    return this._isPubliclyListed;
  }

  get townUpdatePassword(): string {
    return this._townUpdatePassword;
  }

  get players(): Player[] {
    return this._players;
  }

  get occupancy(): number {
    return this.players.length;
  }

  get friendlyName(): string {
    return this._friendlyName;
  }

  set friendlyName(value: string) {
    this._friendlyName = value;
    this._broadcastEmitter.emit('townSettingsUpdated', { friendlyName: value });
  }

  get townID(): string {
    return this._townID;
  }

  get interactables(): InteractableArea[] {
    return this._interactables;
  }

  /** The list of players currently in the town * */
  private _players: Player[] = [];

  /** The videoClient that this CoveyTown will use to provision video resources * */
  private _videoClient: IVideoClient = TwilioVideo.getInstance();

  private _interactables: InteractableArea[] = [];

  private readonly _townID: string;

  private _friendlyName: string;

  private readonly _townUpdatePassword: string;

  private _isPubliclyListed: boolean;

  private _capacity: number;

  private _broadcastEmitter: BroadcastOperator<ServerToClientEvents, SocketData>;

  private _connectedSockets: Set<CoveyTownSocket> = new Set();

  constructor(
    friendlyName: string,
    isPubliclyListed: boolean,
    townID: string,
    broadcastEmitter: BroadcastOperator<ServerToClientEvents, SocketData>,
  ) {
    this._townID = townID;
    this._capacity = 50;
    this._townUpdatePassword = nanoid(24);
    this._isPubliclyListed = isPubliclyListed;
    this._friendlyName = friendlyName;
    this._broadcastEmitter = broadcastEmitter;
  }

  /**
   * Adds a player to this Covey Town, provisioning the necessary credentials for the
   * player, and returning them
   *
   * @param newPlayer The new player to add to the town
   */
  async addPlayer(userName: string, socket: CoveyTownSocket): Promise<Player> {
    const newPlayer = new Player(userName, socket.to(this._townID));
    this._players.push(newPlayer);

    this._connectedSockets.add(socket);

    // Create a video token for this user to join this town
    newPlayer.videoToken = await this._videoClient.getTokenForTown(this._townID, newPlayer.id);

    // Notify other players that this player has joined
    this._broadcastEmitter.emit('playerJoined', newPlayer.toPlayerModel());

    // Register an event listener for the client socket: if the client disconnects,
    // clean up our listener adapter, and then let the CoveyTownController know that the
    // player's session is disconnected
    socket.on('disconnect', () => {
      this._removePlayer(newPlayer);
      this._connectedSockets.delete(socket);
    });

    // Set up a listener to forward all chat messages to all clients in the same interactableArea as the player,
    // and only if the message has the same interactable id as the player
    socket.on('chatMessage', (message: ChatMessage) => {
      const messageId = message.interactableId;
      const playerId = newPlayer.location?.interactableID;
      if (messageId === playerId)
        this._connectedSockets.forEach(c => c.emit('chatMessage', message));
      // this._broadcastEmitter.emit('chatMessage', message);
    });

    // Register an event listener for the client socket: if the client updates their
    // location, inform the CoveyTownController
    socket.on('playerMovement', (movementData: PlayerLocation) => {
      this._updatePlayerLocation(newPlayer, movementData);
    });

    // Set up a listener to process updates to interactables.
    // Currently only knows how to process updates for ViewingAreas and PosterSessionAreas, and
    // ignores any other updates for any other kind of interactable.
    // For ViewingAreas and PosterSessionAreas: Uses the 'newPlayer' object's 'towmEmitter' to forward
    // the interactableUpdate to the other players in the town. Also dispatches an
    // updateModel call to the viewingArea or posterSessionArea that corresponds to the interactable being
    // updated. Does not throw an error if the specified viewing area or poster session area does not exist.
    socket.on('interactableUpdate', (update: Interactable) => {
      if (isViewingArea(update)) {
        newPlayer.townEmitter.emit('interactableUpdate', update);
        const viewingArea = this._interactables.find(
          eachInteractable => eachInteractable.id === update.id,
        );
        if (viewingArea) {
          (viewingArea as ViewingArea).updateModel(update);
        }
      } else if (isPosterSessionArea(update)) {
        // forward interactableUpdate
        newPlayer.townEmitter.emit('interactableUpdate', update);
        // find an existing poster session area with the same ID
        const existingPosterSessionAreaArea = <PosterSessionArea>(
          this._interactables.find(
            area => area.id === update.id && area instanceof PosterSessionArea,
          )
        );
        // updatemodel if theres an existing poster session area with the same ID
        if (existingPosterSessionAreaArea) {
          existingPosterSessionAreaArea.updateModel(update);
        }
      } else if (isCheckersArea(update)) {
        // forward interactableUpdate
        newPlayer.townEmitter.emit('interactableUpdate', update);
        const existingArea = <CheckersArea>(
          this._interactables.find(area => area.id === update.id && area instanceof CheckersArea)
        );
        if (existingArea.board.board) {
          existingArea.updateModel(update);
        }
      }
    });
    return newPlayer;
  }

  /**
   * Destroys all data related to a player in this town.
   *
   * @param session PlayerSession to destroy
   */
  private _removePlayer(player: Player): void {
    if (player.location.interactableID) {
      this._removePlayerFromInteractable(player);
    }
    this._players = this._players.filter(p => p.id !== player.id);
    this._broadcastEmitter.emit('playerDisconnect', player.toPlayerModel());
  }

  /**
   * Updates the location of a player within the town
   *
   * If the player has changed conversation areas, this method also updates the
   * corresponding ConversationArea objects tracked by the town controller, and dispatches
   * any onConversationUpdated events as appropriate
   *
   * @param player Player to update location for
   * @param location New location for this player
   */
  private _updatePlayerLocation(player: Player, location: PlayerLocation): void {
    const prevInteractable = this._interactables.find(
      conv => conv.id === player.location.interactableID,
    );

    if (!prevInteractable?.contains(location)) {
      if (prevInteractable) {
        // Remove from old area
        prevInteractable.remove(player);
      }
      const newInteractable = this._interactables.find(
        eachArea => eachArea.isActive && eachArea.contains(location),
      );
      if (newInteractable) {
        newInteractable.add(player);
      }
      location.interactableID = newInteractable?.id;
    } else {
      location.interactableID = prevInteractable.id;
    }

    player.location = location;

    this._broadcastEmitter.emit('playerMoved', player.toPlayerModel());
  }

  /**
   * Removes a player from a conversation area, updating the conversation area's occupants list,
   * and emitting the appropriate message (area updated or area destroyed)
   *
   * @param player Player to remove from their current conversation area
   */
  private _removePlayerFromInteractable(player: Player): void {
    const area = this._interactables.find(
      eachArea => eachArea.id === player.location.interactableID,
    );
    if (area) {
      area.remove(player);
    }
  }

  /**
   * Creates a new conversation area in this town if there is not currently an active
   * conversation with the same ID. The conversation area ID must match the name of a
   * conversation area that exists in this town's map, and the conversation area must not
   * already have a topic set.
   *
   * If successful creating the conversation area, this method:
   *  Adds any players who are in the region defined by the conversation area to it.
   *  Notifies all players in the town that the conversation area has been updated
   *
   * @param conversationArea Information describing the conversation area to create. Ignores any
   *  occupantsById that are set on the conversation area that is passed to this method.
   *
   * @returns true if the conversation is successfully created, or false if there is no known
   * conversation area with the specified ID or if there is already an active conversation area
   * with the specified ID
   */
  public addConversationArea(conversationArea: ConversationAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === conversationArea.id,
    ) as ConversationArea;
    if (!area || !conversationArea.topic || area.topic) {
      return false;
    }
    area.topic = conversationArea.topic;
    area.addPlayersWithinBounds(this._players);
    this._broadcastEmitter.emit('interactableUpdate', area.toModel());
    return true;
  }

  /**
   * Creates a new viewing area in this town if there is not currently an active
   * viewing area with the same ID. The viewing area ID must match the name of a
   * viewing area that exists in this town's map, and the viewing area must not
   * already have a video set.
   *
   * If successful creating the viewing area, this method:
   *    Adds any players who are in the region defined by the viewing area to it
   *    Notifies all players in the town that the viewing area has been updated by
   *      emitting an interactableUpdate event
   *
   * @param viewingArea Information describing the viewing area to create.
   *
   * @returns True if the viewing area was created or false if there is no known
   * viewing area with the specified ID or if there is already an active viewing area
   * with the specified ID or if there is no video URL specified
   */
  public addViewingArea(viewingArea: ViewingAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === viewingArea.id,
    ) as ViewingArea;
    if (!area || !viewingArea.video || area.video) {
      return false;
    }
    area.updateModel(viewingArea);
    area.addPlayersWithinBounds(this._players);
    this._broadcastEmitter.emit('interactableUpdate', area.toModel());
    return true;
  }

  /**
   * Creates a new checkers area in this town if there is not currently an active
   * checkers area with the same ID. The checkers area ID must match the name of a
   * checkers area that exists in this town's map, and the checkers area must not
   * already have a video set.
   *
   * If successful creating the checkers area, this method:
   *    Adds any players who are in the region defined by the checkers area to it
   *    Notifies all players in the town that the checkers area has been updated by
   *      emitting an interactableUpdate event
   *
   * @param checkersArea Information describing the checkers area to create.
   *
   * @returns True if the checkers area was created or false if there is no known
   * checkers area with the specified ID or if there is already an active viewing area
   * with the specified ID or if there is no video URL specified
   */
  public addCheckersArea(checkersArea: CheckersAreaModel): boolean {
    const area = this._interactables.find(
      eachArea => eachArea.id === checkersArea.id,
    ) as CheckersArea;
    if (!area || !checkersArea.board) {
      return false;
    }
    area.updateModel(checkersArea);
    area.addPlayersWithinBounds(this._players);
    this._broadcastEmitter.emit('interactableUpdate', area.toModel());
    return true;
  }

  /**
   * Creates a new poster session area in this town if there is not currently an active
   * poster session area with the same ID. The poster session area ID must match the name of a
   * poster session area that exists in this town's map, and the poster session area must not
   * already have a poster image set.
   *
   * If successful creating the poster session area, this method:
   *    Adds any players who are in the region defined by the poster session area to it
   *    Notifies all players in the town that the poster session area has been updated by
   *      emitting an interactableUpdate event
   *
   * @param posterSessionArea Information describing the poster session area to create.
   *
   * @returns True if the poster session area was created or false if there is no known
   * poster session area with the specified ID or if there is already an active poster session area
   * with the specified ID or if there is no poster image and title specified
   */
  public addPosterSessionArea(posterSessionArea: PosterSessionAreaModel): boolean {
    // if there's no title or image specified
    if (!posterSessionArea.imageContents || !posterSessionArea.title) {
      return false;
    }
    // find an existing poster session area with the same ID
    const existingPosterSessionArea = <PosterSessionArea>(
      this._interactables.find(
        area => area.id === posterSessionArea.id && area instanceof PosterSessionArea,
      )
    );
    // if the id does not match an existing area, or if it does but the existing area
    // already has an image and title
    if (
      !existingPosterSessionArea ||
      (existingPosterSessionArea.title && existingPosterSessionArea.imageContents)
    ) {
      return false;
    }
    // we've reached here -- it's a valid update
    existingPosterSessionArea.updateModel(posterSessionArea);
    existingPosterSessionArea.addPlayersWithinBounds(this._players);
    this._broadcastEmitter.emit('interactableUpdate', existingPosterSessionArea.toModel());
    return true;
  }

  /**
   * Fetch a player's session based on the provided session token. Returns undefined if the
   * session token is not valid.
   *
   * @param token
   */
  public getPlayerBySessionToken(token: string): Player | undefined {
    return this.players.find(eachPlayer => eachPlayer.sessionToken === token);
  }

  /**
   * Find an interactable by its ID
   *
   * @param id
   * @returns the interactable
   * @throws Error if no such interactable exists
   */
  public getInteractable(id: string): InteractableArea {
    const ret = this._interactables.find(eachInteractable => eachInteractable.id === id);
    if (!ret) {
      throw new Error(`No such interactable ${id}`);
    }
    return ret;
  }

  /**
   * Informs all players' clients that they are about to be disconnected, and then
   * disconnects all players.
   */
  public disconnectAllPlayers(): void {
    this._broadcastEmitter.emit('townClosing');
    this._connectedSockets.forEach(eachSocket => eachSocket.disconnect(true));
  }

  /**
   * Initializes the town's state from a JSON map, setting the "interactables" property of this town
   * to instances of InteractableArea that match each interactable in the map.
   *
   * Each tilemap may contain "objects", and those objects may have properties. Towns
   * support two kinds of interactable objects: "ViewingArea" and "ConversationArea."
   * Initializing the town state from the map, then, means instantiating the corresponding objects.
   *
   * This method will throw an Error if the objects are not valid:
   * In the map file, each object is identified with a name. Names must be unique. Each object also has
   * some kind of geometry that establishes where the object is on the map. Objects must not overlap.
   *
   * @param mapFile the map file to read in, defaults to the "indoors" map in the frontend
   * @throws Error if there is no layer named "Objects" in the map, if the objects overlap or if object
   *  names are not unique
   */
  public initializeFromMap(map: ITiledMap) {
    const objectLayer = map.layers.find(
      eachLayer => eachLayer.name === 'Objects',
    ) as ITiledMapObjectLayer;
    if (!objectLayer) {
      throw new Error(`Unable to find objects layer in map`);
    }
    const viewingAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'ViewingArea')
      .map(eachViewingAreaObject =>
        ViewingArea.fromMapObject(eachViewingAreaObject, this._broadcastEmitter),
      );

    const conversationAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'ConversationArea')
      .map(eachConvAreaObj =>
        ConversationArea.fromMapObject(eachConvAreaObj, this._broadcastEmitter),
      );

    const posterSessionAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'PosterSessionArea')
      .map(eachPSAreaObj => PosterSessionArea.fromMapObject(eachPSAreaObj, this._broadcastEmitter));

    const checkersAreas = objectLayer.objects
      .filter(eachObject => eachObject.type === 'CheckersArea')
      .map(eachChecAreaObj => CheckersArea.fromMapObject(eachChecAreaObj, this._broadcastEmitter));

    this._interactables = this._interactables
      .concat(viewingAreas)
      .concat(conversationAreas)
      .concat(posterSessionAreas)
      .concat(checkersAreas);
    this._validateInteractables();
  }

  private _validateInteractables() {
    // Make sure that the IDs are unique
    const interactableIDs = this._interactables.map(eachInteractable => eachInteractable.id);
    if (
      interactableIDs.some(
        item => interactableIDs.indexOf(item) !== interactableIDs.lastIndexOf(item),
      )
    ) {
      throw new Error(
        `Expected all interactable IDs to be unique, but found duplicate interactable ID in ${interactableIDs}`,
      );
    }
    // Make sure that there are no overlapping objects
    for (const interactable of this._interactables) {
      for (const otherInteractable of this._interactables) {
        if (interactable !== otherInteractable && interactable.overlaps(otherInteractable)) {
          throw new Error(
            `Expected interactables not to overlap, but found overlap between ${interactable.id} and ${otherInteractable.id}`,
          );
        }
      }
    }
  }
}

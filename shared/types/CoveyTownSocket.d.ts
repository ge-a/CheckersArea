export type TownJoinResponse = {
  /** Unique ID that represents this player * */
  userID: string;
  /** Secret token that this player should use to authenticate
   * in future requests to this service * */
  sessionToken: string;
  /** Secret token that this player should use to authenticate
   * in future requests to the video service * */
  providerVideoToken: string;
  /** List of players currently in this town * */
  currentPlayers: Player[];
  /** Friendly name of this town * */
  friendlyName: string;
  /** Is this a private town? * */
  isPubliclyListed: boolean;
  /** Current state of interactables in this town */
  interactables: Interactable[];
};

export type Interactable =
  | ViewingArea
  | ConversationArea
  | PosterSessionArea
  | CheckersArea;

export type TownSettingsUpdate = {
  friendlyName?: string;
  isPubliclyListed?: boolean;
};

export type Direction = "front" | "back" | "left" | "right";
export interface Player {
  id: string;
  userName: string;
  location: PlayerLocation;
}

export type XY = { x: number; y: number };

export interface PlayerLocation {
  /* The CENTER x coordinate of this player's location */
  x: number;
  /* The CENTER y coordinate of this player's location */
  y: number;
  /** @enum {string} */
  rotation: Direction;
  moving: boolean;
  interactableID?: string;
}
export type ChatMessage = {
  author: string;
  sid: string;
  body: string;
  dateCreated: Date;
  interactableId?: string;
};

export interface ConversationArea {
  id: string;
  topic?: string;
  occupantsByID: string[];
}
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ViewingArea {
  id: string;
  video?: string;
  isPlaying: boolean;
  elapsedTimeSec: number;
}

export interface PosterSessionArea {
  id: string;
  stars: number;
  imageContents?: string;
  title?: string;
}

/**
 * Represents a red or black piece on a checker board.
 */
export type CheckerPiece = {
  color: string;
  isKing: boolean;
};

/**
 * Represent a light or dark shaded tile on checkerboard.
 */
export type CheckerTile = {
  shade: string;
  piece: CheckerPiece | null;
};

export type BoardTileState = {
  tile: CheckerTile | null;
  x: integer | null;
  y: integer | null;
  finalTiles: Pos[] | null;
};
/**
 * Represents the cooridnate position of a piece starting in the top left of the board (0,0).
 */
export type Pos = {
  row: number;
  col: number;
};

/**
 * Represents the cooridnate position of a piece starting in the top left of the board (0,0).
 */
export type CheckerMove = {
  source: Pos;
  dest: Pos;
  currPlayer: string;
  board: CheckerTile[][];
};

/**
 * Represents a transportable model with checkerboard data.
 */
export type CheckerBoardModel = {
  board: CheckerTile[][];
  // moveLog?: [];
};

/**
 * Represents a checker board with its individual checker tiles.
 */
export interface CheckerBoard {
  board: CheckerTile[][];
}

/**
 * Represents a checkers game area including the involved players by id.
 */
export interface CheckersArea {
  id: string;
  board: CheckerBoard;
  playerOneID?: string;
  playerTwoID?: string;
  winnerID?: string;
  isPlayerOneTurn: boolean;
  preBoard: Pos[][][][];
}

/**
 * Wraps gameover information. Includes the end board state. Possible contains resignedPlayer
 */
export interface GameOverWrapper {
  board: CheckerTile[][];
  resignedPlayer?: string;
  // Should not post during CheckersAreaController tests
  testing?: boolean;
}

// represents end of game record, the object stored in database per player
export type GameRecord = {
  wins: string[];
  losses: string[];
};

export interface ServerToClientEvents {
  playerMoved: (movedPlayer: Player) => void;
  playerDisconnect: (disconnectedPlayer: Player) => void;
  playerJoined: (newPlayer: Player) => void;
  initialize: (initialData: TownJoinResponse) => void;
  townSettingsUpdated: (update: TownSettingsUpdate) => void;
  townClosing: () => void;
  chatMessage: (message: ChatMessage) => void;
  interactableUpdate: (interactable: Interactable) => void;
}

export interface ClientToServerEvents {
  chatMessage: (message: ChatMessage) => void;
  playerMovement: (movementData: PlayerLocation) => void;
  interactableUpdate: (update: Interactable) => void;
}

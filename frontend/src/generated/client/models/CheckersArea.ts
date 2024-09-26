/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckerBoard } from './CheckerBoard';
import type { Pos } from './Pos';

/**
 * Represents a checkers game area including the involved players by id.
 */
export type CheckersArea = {
    id: string;
    board: CheckerBoard;
    playerOneID?: string;
    playerTwoID?: string;
    winnerID?: string;
    isPlayerOneTurn: boolean;
    preBoard: Array<Array<Array<Array<Pos>>>>;
};


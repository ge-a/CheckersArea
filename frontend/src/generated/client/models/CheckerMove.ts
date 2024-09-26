/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckerTile } from './CheckerTile';
import type { Pos } from './Pos';

/**
 * Represents the cooridnate position of a piece starting in the top left of the board (0,0).
 */
export type CheckerMove = {
    board: Array<Array<CheckerTile>>;
    currPlayer: string;
    dest: Pos;
    source: Pos;
};


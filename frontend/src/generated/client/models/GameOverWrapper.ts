/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckerTile } from './CheckerTile';

/**
 * Wraps gameover information. Includes the end board state. Possible contains resignedPlayer
 */
export type GameOverWrapper = {
    board: Array<Array<CheckerTile>>;
    resignedPlayer?: string;
    testing?: boolean;
};


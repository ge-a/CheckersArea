/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */

import type { CheckerPiece } from './CheckerPiece';

/**
 * Represent a light or dark shaded tile on checkerboard.
 */
export type CheckerTile = {
    piece: CheckerPiece | null;
    shade: string;
};


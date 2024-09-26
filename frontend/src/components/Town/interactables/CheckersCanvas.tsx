import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  CheckerTile,
  CheckersArea as CheckersAreaModel,
  BoardTileState,
} from '../../../types/CoveyTownSocket';
import useTownController from '../../../hooks/useTownController';

import CHECKERS_BOARD from '../../../assets/checkers/checkers_board.png';
import BLACK_PIECE from '../../../assets/checkers/black_piece.png';
import RED_PIECE from '../../../assets/checkers/red_piece.png';
import BLACK_KING from '../../../assets/checkers/black_piece_king.png';
import RED_KING from '../../../assets/checkers/red_piece_king.png';
import POSSIBLE_TILE_HIGHLIGHT from '../../../assets/checkers/tile_highlight.png';
import CURR_TILE_HIGHLIGHT from '../../../assets/checkers/yellow_highlight.png';
import CheckersAreaController, {
  useBoard,
  useCurrentTurn,
} from '../../../classes/CheckersAreaController';
import { useToast } from '@chakra-ui/react';

export const boardImage = (() => {
  const img = new Image();
  img.src = CHECKERS_BOARD;
  return img;
})();

export const redPieceImage = (() => {
  const img = new Image();
  img.src = RED_PIECE;
  return img;
})();

export const redPieceKingImage = (() => {
  const img = new Image();
  img.src = RED_KING;
  return img;
})();

export const blackPieceImage = (() => {
  const img = new Image();
  img.src = BLACK_PIECE;
  return img;
})();

export const blackPieceKingImage = (() => {
  const img = new Image();
  img.src = BLACK_KING;
  return img;
})();

export const possibleTileHighlight = (() => {
  const img = new Image();
  img.src = POSSIBLE_TILE_HIGHLIGHT;
  return img;
})();

export const currTileHighlight = (() => {
  const img = new Image();
  img.src = CURR_TILE_HIGHLIGHT;
  return img;
})();

const BOARD_SIZE = 500;
const PIECE_SIZE = 62.5;

/**
 * The CheckersCanvas component renders the checker board and game pieces.
 * @param props: A checkersController, which corresponds to the state of the game.
 */
export default function CheckersCanvas({
  checkersController,
}: {
  checkersController: CheckersAreaController;
}): JSX.Element {
  // useRef hook to not re-render
  const boardCanvas = useRef<HTMLCanvasElement | null>(null);
  const boardCanvasContext = useRef<CanvasRenderingContext2D | null>(null);

  const townController = useTownController();
  const checkersAreaController = checkersController;
  const coveyTownController = useTownController();

  const board: CheckerTile[][] = useBoard(checkersAreaController);
  const currentPlayer: 'red' | 'black' = useCurrentTurn(checkersAreaController);

  const [allowedToMove, setAllowedToMove] = useState(
    townController.ourPlayer.id === checkersAreaController.playerTwoID,
  );

  useEffect(() => {
    const isAllow =
      (currentPlayer == 'red' &&
        townController.ourPlayer.id === checkersAreaController.playerOneID) ||
      (currentPlayer == 'black' &&
        townController.ourPlayer.id === checkersAreaController.playerTwoID);
    setAllowedToMove(isAllow);
  }, [
    checkersAreaController.playerOneID,
    checkersAreaController.playerTwoID,
    currentPlayer,
    townController.ourPlayer.id,
  ]);

  // Represents the tile a piece is going to move from
  const [currTileState, setCurrTileState] = useState<BoardTileState>({
    tile: null,
    x: null,
    y: null,
    finalTiles: null,
  });
  // All the possible moves that precompute gives us
  // const [allPossibleMoves, setAllPossibleMoves] = useState<Pos[][][][] | null>(null);
  const toast = useToast();
  // Callback for handling movement on board
  const handleMovingPiece = useCallback(
    event => {
      function submitMove(source: BoardTileState, dest: BoardTileState) {
        // post move to the backend
        coveyTownController
          .postPieceMove(checkersAreaController.toCheckersAreaModel(), source, dest)
          .then((newModel: CheckersAreaModel) => {
            checkersAreaController.updateFrom(newModel);
            townController.emitCheckersAreaUpdate(checkersAreaController);
            toast({
              title: `Move made. Waiting for ${
                checkersAreaController.isPlayerOneTurn ? 'red' : 'black'
              } to move`,
              status: 'info',
              duration: 2000,
              position: 'top-left',
            });
          });
      }
      if (
        boardCanvas.current &&
        checkersAreaController.playerOneID &&
        checkersAreaController.playerTwoID &&
        allowedToMove
      ) {
        const rect = boardCanvas.current.getBoundingClientRect();
        const x = Math.floor((event.clientX - rect.left) / PIECE_SIZE);
        const y = Math.floor((event.clientY - rect.top) / PIECE_SIZE);
        // Click outside of the checker board should be disregarded in this call back
        if (x > 7 || x < 0 || y > 7 || y < 0) {
          return;
        }
        const selectedTile: CheckerTile = board[y][x];
        const selectedTileState: BoardTileState = {
          tile: selectedTile,
          x: x,
          y: y,
          finalTiles: null,
        };
        // Curr Tile already selected and selected tile is empty.
        // Or curr tile is same as selected tile and it is a possible move.
        // Perform move
        const moveToSameTile = currTileState?.finalTiles?.some(pos => pos.col == x && pos.row == y);
        if (
          currTileState &&
          ((currTileState.tile && !selectedTile.piece) || (currTileState.tile && moveToSameTile))
        ) {
          const contains = currTileState.finalTiles?.some(pos => pos.col == x && pos.row == y);
          if (
            currTileState.finalTiles &&
            contains &&
            currTileState.tile.piece?.color === currentPlayer
          ) {
            // send request to make move and update board to be the new board
            submitMove(currTileState, selectedTileState);
            setCurrTileState({ tile: null, x: null, y: null, finalTiles: null });
          }
          // The Curr tile is already selected and the selected tile is a possible move for the selected tile
          // Curr tile already selected and selected tile has piece on it. Change the selected tile.
        } else if (currTileState && selectedTile.piece) {
          if (checkersAreaController.preBoard && checkersAreaController.preBoard[y][x]) {
            const allMoves = checkersAreaController.preBoard[y][x];
            const finalPositions = allMoves.map(move => move[move.length - 1]);
            setCurrTileState({ tile: selectedTile, x: x, y: y, finalTiles: finalPositions });
          }
          // Curr tile not selected, so set the curr tile to be the selected tile.
        } else if (!currTileState && selectedTile.piece) {
          if (checkersAreaController.preBoard && checkersAreaController.preBoard[y][x]) {
            const allMoves = checkersAreaController.preBoard[y][x];
            const finalPositions = allMoves.map(move => move[move.length - 1]);
            setCurrTileState({ tile: selectedTile, x: x, y: y, finalTiles: finalPositions });
          }
        }
      }
    },
    [
      allowedToMove,
      townController,
      checkersAreaController,
      coveyTownController,
      toast,
      board,
      currTileState,
      currentPlayer,
    ],
  );

  useEffect(() => {
    const currentCanvas = boardCanvas.current;

    if (currentCanvas) {
      boardCanvasContext.current = currentCanvas.getContext('2d');
      const boardContext = boardCanvasContext.current;
      if (boardContext) {
        boardContext.drawImage(boardImage, 0, 0, BOARD_SIZE, BOARD_SIZE);
        for (let y = 0; y < board.length; y += 1) {
          for (let x = 0; x < board[0].length; x += 1) {
            const tile: CheckerTile = board[y][x];
            const xCoord = x * PIECE_SIZE;
            const yCoord = y * PIECE_SIZE;

            // Draw pieces
            if (tile.piece?.color == 'black') {
              if (tile.piece.isKing) {
                boardContext.drawImage(blackPieceKingImage, xCoord, yCoord, PIECE_SIZE, PIECE_SIZE);
              } else {
                boardContext.drawImage(blackPieceImage, xCoord, yCoord, PIECE_SIZE, PIECE_SIZE);
              }
            } else if (tile.piece?.color == 'red') {
              if (tile.piece.isKing) {
                boardContext.drawImage(redPieceKingImage, xCoord, yCoord, PIECE_SIZE, PIECE_SIZE);
              } else {
                boardContext.drawImage(redPieceImage, xCoord, yCoord, PIECE_SIZE, PIECE_SIZE);
              }
            }
            // Highlight selected tile
            if (currTileState) {
              const selected =
                currTileState &&
                currTileState.x == x &&
                currTileState.y == y &&
                currTileState.tile &&
                currTileState.tile.piece?.color == currentPlayer;
              if (selected) {
                boardContext.drawImage(currTileHighlight, xCoord, yCoord, PIECE_SIZE, PIECE_SIZE);
              }
            }

            // Draw possible final positions
            const contains = currTileState?.finalTiles?.some(pos => pos.col == x && pos.row == y);
            if (contains) {
              boardContext.drawImage(possibleTileHighlight, xCoord, yCoord, PIECE_SIZE, PIECE_SIZE);
            }
          }
        }
      }
      currentCanvas.addEventListener('click', handleMovingPiece);
    }
    // Unmount the onclick
    return () => {
      if (currentCanvas) {
        currentCanvas.removeEventListener('click', handleMovingPiece);
      }
    };
  }, [board, currTileState, currentPlayer, handleMovingPiece, checkersAreaController]);

  return (
    <div id='board-div'>
      <canvas ref={boardCanvas} width='500' height='500' style={{ position: 'absolute' }}></canvas>
    </div>
  );
}

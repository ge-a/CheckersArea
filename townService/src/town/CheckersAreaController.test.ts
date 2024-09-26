import { DeepMockProxy, mockDeep } from 'jest-mock-extended';
import { nanoid } from 'nanoid';
import { Interactable, TownEmitter, CheckersArea } from '../types/CoveyTownSocket';
import TownsStore from '../lib/TownsStore';
import { getLastEmittedEvent, mockPlayer, MockedPlayer, isCheckersArea } from '../TestUtils';
import { TownsController } from './TownsController';
import CheckerBoard from '../lib/CheckerBoard';

type TestTownData = {
  friendlyName: string;
  townID: string;
  isPubliclyListed: boolean;
  townUpdatePassword: string;
};

const broadcastEmitter = jest.fn();
describe('TownsController integration tests', () => {
  let controller: TownsController;

  const createdTownEmitters: Map<string, DeepMockProxy<TownEmitter>> = new Map();
  async function createTownForTesting(
    friendlyNameToUse?: string,
    isPublic = false,
  ): Promise<TestTownData> {
    const friendlyName =
      friendlyNameToUse !== undefined
        ? friendlyNameToUse
        : `${isPublic ? 'Public' : 'Private'}TestingTown=${nanoid()}`;
    const ret = await controller.createTown({
      friendlyName,
      isPubliclyListed: isPublic,
      mapFile: 'testData/indoors.json',
    });
    return {
      friendlyName,
      isPubliclyListed: isPublic,
      townID: ret.townID,
      townUpdatePassword: ret.townUpdatePassword,
    };
  }
  function getBroadcastEmitterForTownID(townID: string) {
    const ret = createdTownEmitters.get(townID);
    if (!ret) {
      throw new Error(`Could not find broadcast emitter for ${townID}`);
    }
    return ret;
  }

  beforeAll(() => {
    // Set the twilio tokens to dummy values so that the unit tests can run
    process.env.TWILIO_API_AUTH_TOKEN = 'testing';
    process.env.TWILIO_ACCOUNT_SID = 'ACtesting';
    process.env.TWILIO_API_KEY_SID = 'testing';
    process.env.TWILIO_API_KEY_SECRET = 'testing';
  });

  beforeEach(async () => {
    createdTownEmitters.clear();
    broadcastEmitter.mockImplementation((townID: string) => {
      const mockRoomEmitter = mockDeep<TownEmitter>();
      createdTownEmitters.set(townID, mockRoomEmitter);
      return mockRoomEmitter;
    });
    TownsStore.initializeTownsStore(broadcastEmitter);
    controller = new TownsController();
  });

  describe('Interactables', () => {
    let testingTown: TestTownData;
    let player: MockedPlayer;
    let sessionToken: string;
    let interactables: Interactable[];
    beforeEach(async () => {
      testingTown = await createTownForTesting(undefined, true);
      player = mockPlayer(testingTown.townID);
      await controller.joinTown(player.socket);
      const initialData = getLastEmittedEvent(player.socket, 'initialize');
      sessionToken = initialData.sessionToken;
      interactables = initialData.interactables;
    });

    describe('getCheckersAreaPlayers', () => {
      it("Gets the undefined checkers area players' ids", async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          const players = await controller.getCheckersAreaPlayers(
            testingTown.townID,
            newCheckersArea.id,
            sessionToken,
          );
          expect(players).toEqual([undefined, undefined]);
        }
      });
      it("Gets the defined checkers area players' ids", async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          const players = await controller.getCheckersAreaPlayers(
            testingTown.townID,
            newCheckersArea.id,
            sessionToken,
          );
          expect(players).toEqual([playerOneID, playerTwoID]);
        }
      });
      it('Returns an error message if the town ID is invalid', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaPlayers(nanoid(), newCheckersArea.id, sessionToken),
          ).rejects.toThrow();
        }
      });
      it('Checks for a valid session token before getting the players', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const invalidSessionToken = nanoid();
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaPlayers(
              testingTown.townID,
              newCheckersArea.id,
              invalidSessionToken,
            ),
          ).rejects.toThrow();
        }
      });
      it('Checks for a valid checkersArea id before getting the players', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaPlayers(testingTown.townID, nanoid(), sessionToken),
          ).rejects.toThrow();
        }
      });
    });
    describe('getCheckersAreaWinner', () => {
      it('Gets playerOneID if playerTwo resigned', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          const winnerId = await controller.getCheckersAreaWinner(
            testingTown.townID,
            newCheckersArea.id,
            sessionToken,
            {
              resignedPlayer: playerTwoID,
              board: board.board,
              testing: true,
            },
          );
          expect(winnerId).toEqual(playerOneID);
        }
      });
      it('Gets playerTwoID if playerOne resigned', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          const winnerId = await controller.getCheckersAreaWinner(
            testingTown.townID,
            newCheckersArea.id,
            sessionToken,
            {
              resignedPlayer: playerOneID,
              board: board.board,
              testing: true,
            },
          );
          expect(winnerId).toEqual(playerTwoID);
        }
      });
      it('Returns undefined winner if there is no winner', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          const winnerId = await controller.getCheckersAreaWinner(
            testingTown.townID,
            newCheckersArea.id,
            sessionToken,
            {
              board: board.board,
              testing: true,
            },
          );
          expect(winnerId).toBeUndefined();
        }
      });
      it('Returns an error message if the town ID is invalid', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaWinner(nanoid(), newCheckersArea.id, sessionToken, {
              board: board.board,
              testing: true,
            }),
          ).rejects.toThrow();
        }
      });
      it('Checks for a valid session token before getting the winner', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const invalidSessionToken = nanoid();
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaWinner(
              testingTown.townID,
              newCheckersArea.id,
              invalidSessionToken,
              {
                board: board.board,
                testing: true,
              },
            ),
          ).rejects.toThrow();
        }
      });
      it('Checks for a valid checkers area id before getting the winner', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const playerOneID = 'player1';
          const playerTwoID = 'player2';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaWinner(testingTown.townID, nanoid(), sessionToken, {
              board: board.board,
              testing: true,
            }),
          ).rejects.toThrow();
        }
      });
      it('Checks for a PlayerOne id before getting the winner', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const playerOneID = 'player1';
          const board = { board: CheckerBoard.initBoard() };
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerOneID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaWinner(testingTown.townID, newCheckersArea.id, sessionToken, {
              board: board.board,
              testing: true,
            }),
          ).rejects.toThrow();
        }
      });
      it('Checks for a PlayerTwo id before getting the winner', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const playerTwoID = 'player2';
          const newCheckersArea: CheckersArea = {
            board,
            id: checkersArea.id,
            playerTwoID,
            isPlayerOneTurn: true,
            preBoard: [],
          };
          await controller.createCheckersArea(testingTown.townID, sessionToken, newCheckersArea);
          await expect(
            controller.getCheckersAreaWinner(testingTown.townID, newCheckersArea.id, sessionToken, {
              board: board.board,
              testing: true,
            }),
          ).rejects.toThrow();
        }
      });
    });
    describe('getCheckerBoardPossibleMoves', () => {
      it("Gets red player's moves", async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const winnerId = await controller.getCheckerBoardPossibleMoves(
            testingTown.townID,
            'red',
            sessionToken,
            board.board,
          );
          const possibleMovesForRed = [
            [[], [], [], [], [], [], [], []],
            [[], [], [], [], [], [], [], []],
            [
              [],
              [[{ row: 3, col: 0 }], [{ row: 3, col: 2 }]],
              [],
              [[{ row: 3, col: 2 }], [{ row: 3, col: 4 }]],
              [],
              [[{ row: 3, col: 4 }], [{ row: 3, col: 6 }]],
              [],
              [[{ row: 3, col: 6 }]],
            ],
            [[], [], [], [], [], [], [], []],
            [[], [], [], [], [], [], [], []],
            [[], [], [], [], [], [], [], []],
            [[], [], [], [], [], [], [], []],
            [[], [], [], [], [], [], [], []],
          ];
          expect(winnerId).toEqual(possibleMovesForRed);
        }
      });
      it("Gets black player's moves", async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          const winnerId = await controller.getCheckerBoardPossibleMoves(
            testingTown.townID,
            'black',
            sessionToken,
            board.board,
          );
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
          expect(winnerId).toEqual(possibleMovesForBlack);
        }
      });
      it('Returns an error message if the town ID is invalid', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const board = { board: CheckerBoard.initBoard() };
          await expect(
            controller.getCheckerBoardPossibleMoves(nanoid(), 'black', sessionToken, board.board),
          ).rejects.toThrow();
        }
      });
      it('Checks for a valid session token before getting the winner', async () => {
        const checkersArea = interactables.find(isCheckersArea) as CheckersArea;
        if (!checkersArea) {
          fail('Expected at least one checkers area to be returned in the initial join data');
        } else {
          const invalidSessionToken = nanoid();
          const board = { board: CheckerBoard.initBoard() };
          await expect(
            controller.getCheckerBoardPossibleMoves(
              testingTown.townID,
              'black',
              invalidSessionToken,
              board.board,
            ),
          ).rejects.toThrow();
        }
      });
    });
  });
});

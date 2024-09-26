import {
  Box,
  Button,
  Divider,
  Flex,
  HStack,
  Modal,
  ModalContent,
  ModalOverlay,
  Tag,
  VStack,
  useToast,
} from '@chakra-ui/react';
import React, { useCallback, useEffect, useState } from 'react';
import {
  useCurrentTurn,
  usePlayerOneID,
  usePlayerTwoID,
  useWinnerID,
} from '../../../classes/CheckersAreaController';
import { useCheckersAreaController, useInteractable } from '../../../classes/TownController';
import useTownController from '../../../hooks/useTownController';
import CheckersArea from './CheckersArea';
import CheckersCanvas from './CheckersCanvas';
import { GameRecord } from '../../../types/CoveyTownSocket';

/**
 * NewCheckersModal contains the canvas with all game pieces as well as renders
 * outer elements of the game front end such as displaying the player names,
 * any rules, text, or buttons such as close window.
 */
export default function NewCheckersModal(): JSX.Element {
  const townController = useTownController();

  const checkersArea = useInteractable<CheckersArea>('checkersArea');
  const checkersAreaController = useCheckersAreaController();

  const playerOneID = usePlayerOneID(checkersAreaController);
  const playerTwoID = usePlayerTwoID(checkersAreaController);

  const winnerID = useWinnerID(checkersAreaController);
  const toast = useToast();

  let modalMinW = '650px';
  let modalMinH = '650px';

  const currentPlayer: 'red' | 'black' = useCurrentTurn(checkersAreaController);
  const arePlaying = playerOneID && playerTwoID && !winnerID;
  const [leaderBoard, setLeaderBoard] = useState({ p1: '', p2: '' });

  // update players from the backend
  useEffect(() => {
    townController.getCheckersPlayers(checkersAreaController).then(players => {
      checkersAreaController.playerOneID = players[0];
      checkersAreaController.playerTwoID = players[1];
    });
  });

  let modalContent;
  const isOpen = checkersArea !== undefined;

  // pause player movement during checkers
  useEffect(() => {
    if (checkersArea) {
      townController.pause();
    } else {
      townController.unPause();
    }
  }, [townController, checkersArea]);

  // close modal and end interaction
  const closeModal = useCallback(() => {
    if (checkersArea) {
      townController.interactEnd(checkersArea);
    }
    townController.unPause();
  }, [townController, checkersArea]);

  const playerOneJoinButton = (
    <>
      {playerOneID && townController.players.find(p => p.id === playerOneID) ? (
        <Tag colorScheme='red'>
          {townController.players.find(p => p.id === playerOneID)?.userName}
          {townController.ourPlayer.id === playerOneID ? ' (you)' : ''}
        </Tag>
      ) : (
        <Button
          p={2}
          borderRadius='md'
          boxShadow='md'
          _hover={{ boxShadow: 'lg' }}
          _active={{ boxShadow: 'xl' }}
          onClick={() => {
            checkersAreaController.playerOneID = townController.ourPlayer.id;
            townController.emitCheckersAreaUpdate(checkersAreaController);
          }}>
          {playerTwoID && townController.ourPlayer.id === playerTwoID
            ? 'Waiting on another player...'
            : 'Join as Player One'}
        </Button>
      )}
    </>
  );

  const playerTwoJoinButton = (
    <>
      {playerTwoID && townController.players.find(p => p.id === playerTwoID) ? (
        <Tag colorScheme='gray'>
          {townController.players.find(p => p.id === playerTwoID)?.userName}
          {townController.ourPlayer.id === playerTwoID ? ' (you)' : ''}
        </Tag>
      ) : (
        <Button
          p={2}
          borderRadius='md'
          boxShadow='md'
          _hover={{ boxShadow: 'lg' }}
          _active={{ boxShadow: 'xl' }}
          onClick={() => {
            checkersAreaController.playerTwoID = townController.ourPlayer.id;
            townController.emitCheckersAreaUpdate(checkersAreaController);
          }}>
          {playerOneID && townController.ourPlayer.id === playerOneID
            ? 'Waiting on another player...'
            : 'Join as Player Two'}
        </Button>
      )}
    </>
  );
  function countRecord(rec: GameRecord, selector: 'wins' | 'losses') {
    if (selector === 'wins') {
      return rec.wins.filter(s => s.length > 0 && s != 'null').length;
    } else {
      return rec.losses.filter(s => s.length > 0 && s != 'null').length;
    }
  }

  // fetches the win loss for each player
  function onLeaderBoardClick() {
    if (playerOneID && playerTwoID) {
      // get leaderboard data for playerOneID and playerTwoID
      townController.getLeaderBoard(checkersAreaController.toCheckersAreaModel()).then(records => {
        // counting the leaderboard data if records is
        if (records) {
          const p1Record = records[0];
          const p2Record = records[1];
          const p1WLCount = p1Record
            ? {
                winCount: countRecord(p1Record, 'wins'),
                loseCount: countRecord(p1Record, 'losses'),
              }
            : { winCount: 0, loseCount: 0 };
          const p2WLCount = p2Record
            ? {
                winCount: countRecord(p2Record, 'wins'),
                loseCount: countRecord(p2Record, 'losses'),
              }
            : { winCount: 0, loseCount: 0 };
          toast({
            title: `Got Player records`,
            description: `P1 Wins: ${p1WLCount.winCount} | P2 Wins: ${p2WLCount.winCount}`,
            status: 'info',
            duration: 4000,
            position: 'top-left',
          });
          setLeaderBoard({
            p1: `Record: ${p1WLCount.winCount} -- ${p1WLCount.loseCount}`,
            p2: `Record: ${p2WLCount.winCount} -- ${p2WLCount.loseCount}`,
          });
        }
      });
    } else {
      toast({
        title: `P1 and P2 not joined yet`,
        status: 'error',
        duration: 1000,
        position: 'top-left',
      });
    }
  }

  function onNewGameClick() {
    checkersAreaController.resetGame();
    townController.emitCheckersAreaUpdate(checkersAreaController);
    setLeaderBoard({ p1: '', p2: '' });
  }

  function onResignClick() {
    const resignedPlayer = townController.ourPlayer.id;
    if (resignedPlayer) {
      if (resignedPlayer === playerOneID) {
        checkersAreaController.winnerID = playerTwoID;
      } else {
        checkersAreaController.winnerID = playerOneID;
      }
    }
    townController.emitCheckersAreaUpdate(checkersAreaController);

    // get and post the winner to the backend
    townController
      .checkersWin(checkersAreaController.toCheckersAreaModel(), {
        board: checkersAreaController.board.board,
        resignedPlayer,
      })
      .then((daWinner: string | undefined) => {
        townController.emitCheckersAreaUpdate(checkersAreaController);
        toast({
          title: `Winner Submitted, ${daWinner}`,
          status: 'info',
          duration: 2000,
        });
      });
  }

  const redCircle = (
    <Box
      w='25px'
      h='25px'
      borderRadius='50%'
      backgroundColor='red.400'
      border='1px solid darkRed'
      borderWidth='2px'
    />
  );
  const blackCircle = (
    <Box
      w='25px'
      h='25px'
      borderRadius='50%'
      backgroundColor='gray.600'
      border='1px solid black'
      borderWidth='2px'
    />
  );

  const leaderBoardButton = (
    <Box
      p={2}
      borderRadius='md'
      boxShadow='md'
      _hover={{ boxShadow: 'lg' }}
      _active={{ boxShadow: 'xl' }}>
      <Button onClick={() => onLeaderBoardClick()}>Show LeaderBoard</Button>
    </Box>
  );

  const resignButton = (
    <Box
      p={2}
      borderRadius='md'
      boxShadow='md'
      _hover={{ boxShadow: 'lg' }}
      _active={{ boxShadow: 'xl' }}>
      <Button onClick={() => onResignClick()}>Resign</Button>
    </Box>
  );

  const newGameButton = (
    <Box
      p={2}
      borderRadius='md'
      boxShadow='md'
      _hover={{ boxShadow: 'lg' }}
      _active={{ boxShadow: 'xl' }}>
      <Button onClick={() => onNewGameClick()}>New Game</Button>
    </Box>
  );

  // Main part of UI with board and player join buttons
  const canvasContainer = (
    <Box bg='gray.800' borderRadius='md' flex={1} p={2}>
      {playerOneJoinButton}{' '}
      {leaderBoard.p1.length > 0 && <Tag colorScheme='yellow'>{leaderBoard.p1}</Tag>}
      <Box p={2} borderRadius='md' mb={500} mr={500}>
        <CheckersCanvas checkersController={checkersAreaController} />
      </Box>
      {playerTwoJoinButton}
      {leaderBoard.p2.length > 0 && <Tag colorScheme='yellow'>{leaderBoard.p2}</Tag>}
    </Box>
  );

  const infoContainer = (
    <Box>
      <Flex fontSize='lg' textColor={'white'} fontWeight='bold'>
        <Box pr='2'>{checkersAreaController.getPieceCounts('red')}</Box>
        {redCircle}
      </Flex>
      <Divider p={4} borderColor='transparent' opacity={0} />
      <Box fontSize='md' p='2' boxShadow='lg' bg={currentPlayer} textColor='white'>
        <Box>{currentPlayer + "'s turn"}</Box>
      </Box>
      <Divider p={4} borderColor='transparent' opacity={0} />
      <Flex fontSize='lg' textColor={'white'} fontWeight='bold'>
        <Box pr='2'>{checkersAreaController.getPieceCounts('black')}</Box>
        {blackCircle}
      </Flex>
    </Box>
  );

  const buttonContainer = (
    <Box flex={1} bg='gray.400' p={4} borderRadius='md' h='650px'>
      <VStack>
        {leaderBoardButton}
        {resignButton}
        <Divider p={4} height='65px' borderColor='transparent' opacity={0} />
        {arePlaying ? infoContainer : <> </>}
        <Divider p={1} borderColor='transparent' opacity={0} />
      </VStack>
    </Box>
  );

  const gameOverContainer = (
    <Flex bg='gray.500' p={4} w='400px' h='200px'>
      <Box flex={1} bg='gray.400' p={4} borderRadius='md'>
        <Box textColor='white' fontSize='xl' fontWeight='bold' alignContent='center'>
          {townController.ourPlayer.id == winnerID ? 'You Win!' : 'You Lose!'}
        </Box>
        <VStack>{newGameButton}</VStack>
        <VStack>{leaderBoardButton}</VStack>
      </Box>
    </Flex>
  );

  // Show the UI when the player interacts with the area
  if (checkersArea && !winnerID) {
    // and not game over
    modalContent = (
      <Flex bg='gray.500' p={4} w='650px' h='650px'>
        <HStack>
          {winnerID}
          {canvasContainer}
          {buttonContainer}
        </HStack>
      </Flex>
    );
  }

  if (winnerID) {
    modalMinW = '200px';
    modalMinH = '200px';
    // and game over
    modalContent = (
      <Flex bg='gray.500' p={4} minW='400px'>
        {gameOverContainer}
      </Flex>
    );
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={() => {
        closeModal();
      }}>
      <ModalOverlay />
      <ModalContent minW={modalMinW} minH={modalMinH}>
        {modalContent}
      </ModalContent>
    </Modal>
  );
}

/* eslint-disable no-console */
import { initializeApp } from 'firebase/app';
import { child, get, getDatabase, ref, set, update } from 'firebase/database';
import { logError } from '../Utils';
import { GameRecord } from '../types/CoveyTownSocket';

// Import the functions you need from the SDKs you need
// https://firebase.google.com/docs/web/setup#available-libraries
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyChTl96u69LPsXqPd4Ual4zSCNzsd85mSw',
  authDomain: 'checkers302-9d6d8.firebaseapp.com',
  projectId: 'checkers302-9d6d8',
  storageBucket: 'checkers302-9d6d8.appspot.com',
  messagingSenderId: '168678647305',
  appId: '1:168678647305:web:3fd7914e5cc5ff14c47ad8',
  databaseURL: 'https://checkers302-9d6d8-default-rtdb.firebaseio.com',
  headers: {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  },
};
// Initialize Firebase and get database
const fireApp = initializeApp(firebaseConfig);

// function that returns a firebase database instance
export function startDatabase() {
  const database = getDatabase(fireApp);

  return database;
}

/**
 *
 * @param playerId1 id of player 1
 * @param playerId2 id of player 2
 * @param winner id of player that won the game
 *
 * Adds each player to db if not already present with appropriate record.
 * Updates player's records in db if present.
 */
export async function postGameRecord(p1: string, p2: string, winner: string) {
  const db = startDatabase();

  const p2Ref = ref(db, `leaderboard/${p2}`);
  const p1Ref = ref(db, `leaderboard/${p1}`);

  // updating p1 wins losses
  await get(p1Ref)
    // Check if the playerId already exists in the database
    .then(async snapshot => {
      // If the playerId doesn't exist, add it with child lists
      if (!snapshot.exists()) {
        const initialObject =
          p1 === winner
            ? {
                wins: [p2],
                losses: ['null'],
              }
            : { wins: ['null'], losses: [p2] };
        await set(ref(db, `leaderboard/${p1}`), initialObject);
      } else if (p1 === winner) {
        update(ref(db, `leaderboard/${p1}`), {
          wins: [...snapshot.val().wins, p2],
          losses: [...snapshot.val().losses],
        });
      } else {
        update(ref(db, `leaderboard/${p1}`), {
          wins: [...snapshot.val().wins],
          losses: [...snapshot.val().losses, p2],
        });
      }
    });

  // updating the p2 wins losses
  await get(p2Ref).then(async snapshot => {
    // If the playerId doesn't exist, add it with child lists
    if (!snapshot.exists()) {
      const initialObject =
        p2 === winner
          ? {
              losses: ['null'],
              wins: [p1],
            }
          : {
              wins: ['null'],
              losses: [p1],
            };
      await set(ref(db, `leaderboard/${p2}`), initialObject);
    } else if (p2 === winner) {
      update(ref(db, `leaderboard/${p2}`), {
        wins: [...snapshot.val().wins, p1],
      });
    } else {
      update(ref(db, `leaderboard/${p2}`), {
        losses: [...snapshot.val().losses, p1],
      });
    }
  });
}

async function getPlayerRecord(playerId: string) {
  const db = startDatabase();

  const dbRef = ref(db);
  let retVal = { wins: [], losses: [] };
  await get(child(dbRef, `leaderboard/${playerId}`))
    .then(snapshot => {
      if (snapshot.exists()) {
        retVal = snapshot.val();
      }
    })
    .catch(error => {
      logError(error);
    });

  return retVal;
}

/**
 *
 * @param playerIds List of player ids to retreive game records
 * @returns list of records in the same order as player ids provided
 */
export async function getRecords(playerIds: string[]): Promise<GameRecord[]> {
  const playerRecords = playerIds.map(pid => getPlayerRecord(pid));

  return Promise.all(playerRecords);
}

/**
 *
 * @param record record to query
 * @param opp target player to find record against
 * @returns json of win count and loss count against opponent {wCount:number, lCount:}
 */
export function queryWinLoss(record: GameRecord, opp: string) {
  const wCount = record.wins.filter(pid => pid && pid === opp).length;
  const lCount = record.losses.filter(pid => pid && pid === opp).length;

  return { wCount, lCount };
}

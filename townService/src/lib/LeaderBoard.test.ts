import { nanoid } from 'nanoid';
import { getDatabase, goOffline } from 'firebase/database';
import { postGameRecord, getRecords, queryWinLoss } from './LeaderBoard';

describe('LeaderBoard', () => {
  beforeAll(done => {
    done();
  });

  afterAll(done => {
    // Closing the DB connection allows Jest to exit successfully.
    goOffline(getDatabase());
    done();
  });

  it('postGameRecord', async () => {
    const p1 = nanoid();
    const p2 = nanoid();
    expect(() => postGameRecord(p1, p2, p1)).not.toThrow();
    expect(() => postGameRecord(p1, p2, p1)).not.toThrow();
    const p3 = nanoid();
    expect(() => postGameRecord(p1, p3, p3)).not.toThrow();
    expect(() => postGameRecord(p1, p3, p3)).not.toThrow();
  });

  it('getPlayerResult single', async () => {
    const p1 = 'andy';
    const postedResult = await getRecords([p1]);
    expect(postedResult);
    expect(postedResult[0]?.wins).toContainEqual('srikar');
    expect(postedResult[0]?.losses);
  });
  it('getPlayerResult multiple', async () => {
    const playas = ['andy', 'srikar'];
    const postedResult = await getRecords(playas);
    expect(postedResult);
    expect(postedResult[0]?.wins).toContainEqual('srikar');
    expect(postedResult[1]?.wins);
  });
  it('queryWinLoss', async () => {
    const playa = 'srikar';
    const opponent = 'andy';
    const result = await getRecords([playa]);
    expect(result);
    const winLossCounts = result[0] ? queryWinLoss(result[0], opponent) : null;
    expect(winLossCounts);
  });
});

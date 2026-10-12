import test from 'node:test';
import assert from 'node:assert/strict';
import {nextPlaybackPeriod} from '../src/explorer/playback.mjs';

const periods=['2024-01','2024-03','2025-12'];
test('playback advances only through observed months',()=>{
 assert.equal(nextPlaybackPeriod(periods,'2024-01'),'2024-03');
 assert.equal(nextPlaybackPeriod(periods,'2024-03'),'2025-12');
});
test('the last month stops unless repeat is enabled',()=>{
 assert.equal(nextPlaybackPeriod(periods,'2025-12'),null);
 assert.equal(nextPlaybackPeriod(periods,'2025-12',true),'2024-01');
});
test('empty or single-month data cannot loop',()=>{
 assert.equal(nextPlaybackPeriod([],'',true),null);
 assert.equal(nextPlaybackPeriod(['2024-01'],'2024-01',true),null);
});
test('a month removed by a data refresh restarts at the first observation',()=>{
 assert.equal(nextPlaybackPeriod(periods,'2024-02'),'2024-01');
});

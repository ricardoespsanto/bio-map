/**
 * Nonce Miner Web Worker
 *
 * Runs the brute-force nonce search off the main thread so the UI
 * stays responsive during mining.
 */

import { deriveMasterSeed, findNonce } from '../engine';
import type { MinerRequest, MinerResponse } from '../types';

self.onmessage = async (event: MessageEvent<MinerRequest>) => {
  const { passphrase, markerIndex, markerId, year, month, targetValue, rangeMin, rangeMax, precision } =
    event.data;

  const masterSeed = await deriveMasterSeed(passphrase);

  for await (const update of findNonce(
    masterSeed,
    markerIndex,
    year,
    month,
    targetValue,
    rangeMin,
    rangeMax,
    precision,
  )) {
    if (update.found) {
      const msg: MinerResponse = {
        type: 'found',
        nonce: update.nonce,
        value: update.value,
        markerId,
      };
      self.postMessage(msg);
      return;
    } else {
      const msg: MinerResponse = { type: 'progress', tried: update.tried };
      self.postMessage(msg);
    }
  }

  const msg: MinerResponse = { type: 'notFound', markerId };
  self.postMessage(msg);
};

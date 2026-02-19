import { UuidToolError } from './errors.js';
import { supportsCryptoRandom } from './helpers.js';

const GREGORIAN_OFFSET_100NS = 122192928000000000n;
let lastV1Timestamp = 0n;

function randomBytes(length) {
  if (!supportsCryptoRandom()) {
    throw new UuidToolError(
      'Secure Random Source Unavailable',
      'This browser does not provide a cryptographically secure random source required for UUID generation.'
    );
  }

  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

function bytesToUuid(bytes) {
  const hex = Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function createUuidV4() {
  const bytes = randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return bytesToUuid(bytes);
}

export function createUuidNil() {
  return '00000000-0000-0000-0000-000000000000';
}

export function createUuidV7() {
  const timestamp = BigInt(Date.now());
  const bytes = randomBytes(16);

  bytes[0] = Number((timestamp >> 40n) & 0xffn);
  bytes[1] = Number((timestamp >> 32n) & 0xffn);
  bytes[2] = Number((timestamp >> 24n) & 0xffn);
  bytes[3] = Number((timestamp >> 16n) & 0xffn);
  bytes[4] = Number((timestamp >> 8n) & 0xffn);
  bytes[5] = Number(timestamp & 0xffn);
  bytes[6] = (bytes[6] & 0x0f) | 0x70;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return bytesToUuid(bytes);
}

export function createUuidV1() {
  const now100ns = BigInt(Date.now()) * 10000n + GREGORIAN_OFFSET_100NS;
  const timestamp = now100ns > lastV1Timestamp ? now100ns : lastV1Timestamp + 1n;
  lastV1Timestamp = timestamp;

  const clockSequence = randomBytes(2);
  const nodeId = randomBytes(6);
  nodeId[0] |= 0x01;

  const timeLow = Number(timestamp & 0xffffffffn);
  const timeMid = Number((timestamp >> 32n) & 0xffffn);
  const timeHigh = Number((timestamp >> 48n) & 0x0fffn);

  const bytes = new Uint8Array(16);
  bytes[0] = (timeLow >>> 24) & 0xff;
  bytes[1] = (timeLow >>> 16) & 0xff;
  bytes[2] = (timeLow >>> 8) & 0xff;
  bytes[3] = timeLow & 0xff;
  bytes[4] = (timeMid >>> 8) & 0xff;
  bytes[5] = timeMid & 0xff;
  bytes[6] = ((timeHigh >>> 8) & 0x0f) | 0x10;
  bytes[7] = timeHigh & 0xff;
  bytes[8] = (clockSequence[0] & 0x3f) | 0x80;
  bytes[9] = clockSequence[1];
  bytes.set(nodeId, 10);

  return bytesToUuid(bytes);
}

export function generateUuidByVersion(version) {
  switch (version) {
    case 'v1':
      return createUuidV1();
    case 'v4':
      return createUuidV4();
    case 'v7':
      return createUuidV7();
    case 'nil':
      return createUuidNil();
    default:
      throw new UuidToolError('Unsupported UUID Version', `Version "${version}" is not supported.`);
  }
}

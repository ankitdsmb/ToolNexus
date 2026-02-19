const HEX_PAIR_PATTERN = /^[0-9A-Fa-f]{2}$/;

export function toStringSafe(value) {
  return (value ?? '').toString();
}

export function normalizeLineEndings(value) {
  return value.replace(/\r\n?/g, '\n');
}

export function formatCharCount(value) {
  return `${value.length.toLocaleString()} chars`;
}

export function isHexPair(value) {
  return HEX_PAIR_PATTERN.test(value);
}

export function findInvalidPercentPosition(value) {
  for (let index = 0; index < value.length; index += 1) {
    if (value[index] !== '%') {
      continue;
    }

    const pair = value.slice(index + 1, index + 3);
    if (!isHexPair(pair)) {
      return index;
    }
  }

  return -1;
}

function canDecodePrefix(value, endIndex) {
  try {
    decodeURIComponent(value.slice(0, endIndex));
    return true;
  } catch {
    return false;
  }
}

export function findDecodeFailurePosition(value) {
  const invalidPercentPosition = findInvalidPercentPosition(value);
  if (invalidPercentPosition >= 0) {
    return invalidPercentPosition;
  }

  let low = 1;
  let high = value.length;
  let failure = value.length;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (canDecodePrefix(value, mid)) {
      low = mid + 1;
    } else {
      failure = mid;
      high = mid - 1;
    }
  }

  return Math.max(0, failure - 1);
}

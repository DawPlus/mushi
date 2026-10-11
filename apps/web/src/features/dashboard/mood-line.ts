/**
 * Local Korean mood bank and helper
 * No network, no external secrets, graceful fallback
 */

export const DEFAULT_MOOD_LINES: readonly string[] = [
  '오늘은 가볍게 시작해도 충분해',
  '작은 기록도 나중에 큰 힌트가 돼',
  '북마크 하나 정리해도 하루가 정리돼',
  '무시가 옆에서 응원하고 있어',
  '완벽하지 않아도 꾸준히 가면 닿아',
  '차 한잔 마시고 한 걸음씩 가자',
  '오늘 끝낸 작은 일 하나가 내일을 바꿔',
  '서두르지 않아도 괜찮아, 방향이 맞아',
  '생각이 복잡할 땐 호흡 한 번 크게 쉬어봐',
  '지금 기록해 둔 메모가 큰 자산이 될 거야',
  '오늘의 소소한 성공을 칭찬해 줘',
  '조용한 몰입이 만들어내는 깊이를 믿어봐',
]

/**
 * Returns a deterministic or randomized mood line sequence,
 * ensuring no empty list is ever returned.
 */
export function getMoodLines(customBank?: readonly string[]): string[] {
  if (customBank && customBank.length > 0) {
    return [...customBank]
  }
  return [...DEFAULT_MOOD_LINES]
}

/**
 * Picks a random mood line from the bank
 */
export function getRandomMoodLine(random = Math.random): string {
  const index = Math.floor(random() * DEFAULT_MOOD_LINES.length)
  return DEFAULT_MOOD_LINES[index] ?? DEFAULT_MOOD_LINES[0]!
}

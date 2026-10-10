/** Local greeting generator — no network, no AI. Combinatorial phrase banks. */

type DayPart = 'morning' | 'afternoon' | 'evening' | 'night'

const greetingsByPart: Record<DayPart, string[]> = {
  morning: [
    '좋은 아침이야',
    '상쾌한 아침이야',
    '가벼운 아침이야',
    '포근한 아침이야',
    '맑은 아침이야',
    '힘나는 아침이야',
    '차분한 아침이야',
    '반짝이는 아침이야',
  ],
  afternoon: [
    '좋은 오후야',
    '나른한 오후야',
    '든든한 오후야',
    '집중하기 좋은 오후야',
    '부드러운 오후야',
    '따뜻한 오후야',
    '활기찬 오후야',
    '편안한 오후야',
  ],
  evening: [
    '좋은 저녁이야',
    '고요한 저녁이야',
    '포근한 저녁이야',
    '느긋한 저녁이야',
    '은은한 저녁이야',
    '따뜻한 저녁이야',
    '차분한 저녁이야',
    '잔잔한 저녁이야',
  ],
  night: [
    '좋은 밤이야',
    '고요한 밤이야',
    '늦은 밤에도 반가워',
    '잔잔한 밤이야',
    '포근한 밤이야',
    '조용한 밤이야',
    '은은한 밤이야',
    '느긋한 밤이야',
  ],
}

const vibes = [
  '오늘도 무리하지 말고 한 걸음만 가도 충분해.',
  '작은 진전도 쌓이면 큰 흐름이 돼.',
  '막혀도 괜찮아. 잠깐 쉬고 다시 보면 보여.',
  '완벽보다 계속 가는 쪽이 더 멀리 가.',
  '오늘은 속도보다 방향을 먼저 잡아보자.',
  '복잡한 일은 쪼개면 생각보다 단순해져.',
  '집중이 안 되면 환경부터 가볍게 정리해봐.',
  '잘하고 있어. 티가 안 나도 쌓이고 있어.',
  '급한 불만 끄고, 나머지는 천천히 해도 돼.',
  '한 번에 다 하려고 하지 마. 하나만 끝내도 성공이야.',
  '막힌 지점이 보이면 이미 반은 해결한 거야.',
  '오늘은 깔끔한 커밋 하나만 남겨도 충분해.',
  '몸이 먼저야. 코드는 그다음이야.',
  '실수도 로그야. 다음 선택을 도와줘.',
  '조용히 굴러가는 하루가 제일 든든해.',
  '짧게 보고, 짧게 고치고, 바로 확인하자.',
  '지금의 답답함은 곧 익숙함으로 바뀌어.',
  '커피 한 모금하고, 가장 쉬운 일부터 열어봐.',
  '남과 비교하지 마. 어제의 무시와만 겨뤄.',
  '흐름이 좋으면 타고, 아니면 리듬만 다시 잡자.',
]

const nudges = [
  '필요한 작업 공간으로 바로 이동해.',
  '상태를 한눈 확인하고 가볍게 시작하자.',
  '지금 당장 손대야 할 곳부터 열어봐.',
  '모니터를 보고, 막힌 곳만 짧게 점검해.',
  'Bridge나 Projects에서 오늘의 무대를 골라봐.',
  '원격 CLI가 필요하면 안전하게 읽기만 하자.',
  '자동화 흐름이 떠오르면 적어두고 시작해도 좋아.',
  '오늘은 한 화면만 깊게 들어가도 충분해.',
  '우선순위 하나만 고르고 나머지는 나중에.',
  '환경이 살아 있는지 먼저 보고 들어가자.',
  '작게 확인하고, 자신 있게 다음 칸으로.',
  '지금 컨텍스트에 맞는 메뉴로 바로 점프해.',
]

function dayPart(date = new Date()): DayPart {
  const hour = date.getHours()
  if (hour < 12) return 'morning'
  if (hour < 17) return 'afternoon'
  if (hour < 21) return 'evening'
  return 'night'
}

function pick<T>(items: T[], random = Math.random): T {
  return items[Math.floor(random() * items.length)] as T
}

export type HomeGreeting = {
  title: string
  body: string
  dayPart: DayPart
}

/** Build a fresh local greeting. Call once per mount (or when refreshing). */
export function createHomeGreeting(random = Math.random, now = new Date()): HomeGreeting {
  const part = dayPart(now)
  const greeting = pick(greetingsByPart[part], random)
  const vibe = pick(vibes, random)
  const nudge = pick(nudges, random)
  return {
    title: `${greeting}, 무시.`,
    body: `${vibe} ${nudge}`,
    dayPart: part,
  }
}

export const homeGreetingBankSize =
  Object.values(greetingsByPart).reduce((sum, list) => sum + list.length, 0) * vibes.length * nudges.length

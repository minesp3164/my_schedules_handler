# 취준 리워드 트래커 — 클라이언트 디자인·구현 명세

## 1. 기준과 범위

이 문서는 [agent.md](agent.md)의 MVP를 클라이언트 기준으로 구체화한다.

- 클라이언트는 **React Native + Expo + Expo Router + TypeScript** 한 코드베이스로 만든다.
- 웹은 별도 HTML 페이지가 아니라 **React Native Web PWA**로 빌드한다.
- 스타일은 Tailwind 문법을 React Native에서 사용할 수 있는 **NativeWind**로 작성한다.
- `design-mockups/04-ai-assistant.html`의 다크 퍼플, 카드, 원형 진행도, 모바일 여백을 시각적으로만 참고한다.
- AI 코치·제안·대화·AI 탭·외부 AI 연동은 MVP에서 제외한다.

## 2. 제품 흐름

```text
기기 연결 → 홈 대시보드 → [할 일 완료 | 집중 시작]
                       ↓
              포인트·보상·기록 갱신
                       ↓
           모든 기기에서 서버 상태 재조회
```

서버가 점수와 완료의 기준이다. 클라이언트는 즉시 반응할 수 있지만, 변경 성공 또는 실시간 이벤트 수신 뒤 `/api/v1/dashboard` 데이터를 다시 맞춘다.

## 3. 화면과 내비게이션

Expo Router의 탭 구조는 다음과 같다.

| 경로 | 화면 | 핵심 역할 |
| --- | --- | --- |
| `/(tabs)` | 홈 | 오늘 할 일, 일일 포인트, 보상 궤도, 집중 시작 |
| `/(tabs)/focus` | 집중 | 25분 기본 타이머 시작·일시정지·재개·완료·취소 |
| `/(tabs)/history` | 기록 | 최근 7일 포인트, 누적 완료 일수, 최근 연속 기록 |
| `/(tabs)/settings` | 설정 | 할 일 템플릿, 집중 시간, 재촉 알림, 기기 연결 |
| `/activate` | 기기 연결 | 개인 접속 키로 기기 토큰 발급 |

하단 탭은 `홈 / 집중 / 기록 / 설정` 4개다. 기준 시안의 AI 탭은 사용하지 않는다.

## 4. 홈 화면

### 구성 순서

1. 제품 마크와 날짜(KST)
2. 시간대별 환영 문구
3. 오늘의 할 일 카드
4. 오늘의 보상 궤도 카드 및 집중 시작 버튼
5. 하단 탭

### 오늘의 할 일

- API의 `tasks` 배열을 `position` 순서로 표시한다.
- 한 행에는 제목, 포인트, `completed_count / target_count`, 완료 액션을 표시한다.
- 완료는 토글이 아니라 완료 이벤트 생성이다. 누르면 `POST /api/v1/task_templates/:id/completions`을 호출한다.
- 성공 시 서버 대시보드를 다시 읽어 갱신한다. 실패 시 로컬 완료 상태를 확정하지 않는다.
- 이미 완료된 이벤트는 각 행의 되돌리기 메뉴에서 `DELETE /api/v1/completions/:id`를 호출한다.
- 모든 활성 목표가 채워졌고 서버가 `daily_bonus_awarded`를 반환하면 `오늘 목표 완료 · 보너스 +30점`을 표시한다.

### 보상 궤도

- `daily_summary.points_total`과 MVP 기본 일일 기준 100점으로 표시한다. 이후 settings API가 추가되면 서버 설정값으로 대체한다.
- 중앙에는 비율과 `현재 점수 / 목표 점수`를 함께 표기한다. 색상만으로 진행도를 전달하지 않는다.
- 100점 이상일 때 `오늘의 보상을 달성했어요!`를 표시한다.
- 활성 `focus_session`이 없으면 `25분 집중 시작 · +10점`, 있으면 `집중 중 · 남은 시간`을 표시한다.

## 5. 집중 화면

타이머의 초 단위 값은 서버 카운트다운이 아니라 기기 단조 시계로 계산한다.

| 상태 | 주요 버튼 | 서버 동작 |
| --- | --- | --- |
| `idle` | 집중 시작 | `POST /focus-sessions` |
| `running` | 일시정지, 그만하기 | `PATCH /:id/pause`, `PATCH /:id/cancel` |
| `paused` | 계속하기, 그만하기 | `PATCH /:id/resume`, `PATCH /:id/cancel` |
| 종료 | 완료 요약 | `PATCH /:id/complete` |

- 시작 기본값은 1,500초(25분)이며 설정값으로 1–120분을 허용한다.
- 앱 복귀·화면 재진입 시 `GET /api/v1/focus-sessions/current`으로 복구한다.
- 80% 미만 집중은 완료 포인트가 지급되지 않으므로 서버 오류 `focus_session_too_short`을 안내한다.
- 다른 기기에서 시작한 활성 세션은 같은 화면에서 복구하고 `다른 기기에서 시작한 집중이에요`를 노출한다.

## 6. 기록·설정 화면

- 기록은 `GET /api/v1/history?from=&to=`로 최근 7일의 일별 점수와 이벤트를 표시한다.
- 누적 완료 일수와 최근 연속 기록은 별도 라벨로 표시해, 연속 기록이 끊겨도 누적 성취가 사라진 것처럼 보이지 않게 한다.
- 설정은 서버 API가 제공될 때까지 화면 상태만 만들지 않는다. 할 일 템플릿 관리는 현 API의 `GET/POST/PATCH/DELETE /api/v1/task_templates`에 직접 연결한다.
- 개인 접속 키와 기기 토큰은 화면이나 로그에 표시하지 않는다. 모바일은 SecureStore, 웹은 일반 저장소를 사용한다.

## 7. NativeWind 디자인 토큰

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| `canvas` | `#11111B` | 웹 바깥 배경 |
| `screen` | `#171526` | 앱 화면 배경 |
| `surface` | `#211E35` | 기본 카드 |
| `line` | `#403A62` | 카드 테두리 |
| `lavender` | `#B58CFF` | 주요 버튼·진행도 |
| `muted` | `#AAA6C2` | 보조 텍스트 |
| `success` | `#3DCDBE` | 완료 상태 |
| `reward` | `#FFCA76` | 보상 달성 |

NativeWind `className`을 사용해 화면을 구현한다.

```tsx
<View className="rounded-[20px] border border-line bg-surface p-5">
  <Text className="text-[17px] font-bold text-white">오늘의 보상 궤도</Text>
  <Text className="mt-1 text-sm text-muted">보상까지 35점 남았어요</Text>
</View>
```

모바일 콘텐츠는 좌우 20px 여백과 최소 44×44px 터치 영역을 사용한다. 원형 진행도에는 수치와 레이블을 함께 넣는다. `reduce motion`이 켜진 환경에서는 카운트업과 궤도 애니메이션을 생략한다.

## 8. 데이터·오류 처리

TanStack Query가 서버 캐시를 관리한다.

| 사용자 동작 | 요청 | 성공 후 처리 |
| --- | --- | --- |
| 홈 진입 | `GET /dashboard` | 홈 캐시 저장 |
| 할 일 완료 | `POST /task_templates/:id/completions` | 대시보드 무효화·재조회 |
| 완료 취소 | `DELETE /completions/:id` | 대시보드 무효화·재조회 |
| 집중 시작/제어 | focus session API | 현재 세션·대시보드 무효화 |
| 실시간 이벤트 | `TrackerChannel` | 해당 화면의 캐시 무효화 |

- 변경 요청에는 UUID `Idempotency-Key`를 넣고 재시도 시 같은 키를 사용한다.
- `409 target_already_met`은 `오늘 목표 횟수를 채웠어요.` 토스트 후 대시보드를 재조회한다.
- 네트워크가 없을 때는 완료/타이머 시작 버튼을 비활성화하고 `연결 후 기록할 수 있어요.`를 표시한다. MVP에서 오프라인 쓰기는 하지 않는다.
- 로딩은 카드 크기를 유지하는 스켈레톤으로, 오류는 다시 시도 가능한 인라인 안내로 표현한다.

## 9. 파일 구조

```text
apps/tracker/
├── app/
│   ├── _layout.tsx
│   ├── activate.tsx
│   └── (tabs)/
│       ├── _layout.tsx
│       ├── index.tsx
│       ├── focus.tsx
│       ├── history.tsx
│       └── settings.tsx
├── components/
│   ├── dashboard/
│   └── common/
├── features/
│   ├── dashboard/
│   ├── tasks/
│   └── timer/
├── services/
│   ├── api.ts
│   └── device-token.ts
├── global.css
├── tailwind.config.js
└── metro.config.js
```

## 10. 검증 기준

- 웹과 앱이 동일한 Expo Router 코드베이스에서 실행된다.
- 브라우저에서 모바일 폭으로 홈의 카드·보상 궤도·하단 탭이 잘리지 않는다.
- 완료 이벤트 하나가 한 번만 생성되고, 다시 조회한 서버 데이터로 점수와 완료 수가 갱신된다.
- 활성 타이머가 새로고침/재진입 뒤 복구된다.
- AI 관련 UI와 API 호출이 없다.

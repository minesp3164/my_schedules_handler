module Badges
  # 배지 규칙은 전역 테이블에 둔다. 최초에는 코드 기본값(63종)으로 만들고,
  # 이후 실행에서는 새 키만 추가한다. 운영 중 고친 임계값·문구 등은 덮어쓰지
  # 않되, 표시 순서(position)만 기본값 배열 순서에 맞춰 정리한다.
  class SyncDefaultRules
    def self.call(...)
      new(...).call
    end

    def call
      existing_by_key = BadgeRule
        .where(key: default_rules.map { |attributes| attributes.fetch(:key) })
        .index_by(&:key)
      default_rules.each_with_index do |attributes, position|
        existing = existing_by_key[attributes.fetch(:key)]
        if existing
          existing.update!(position: position) if existing.position != position
        else
          BadgeRule.create!(attributes.merge(position: position))
        end
      end
      active_rules
    end

    private

    def active_rules
      BadgeRule.where(active: true).order(:position, :key)
    end

    # 임계값은 초반 구간을 촘촘하게(1·3·7·10·25·30) 배치해 자주 오르게 하고,
    # 뒤로 갈수록 한 단계씩 넓힌다.
    def default_rules
      [
        # 루틴: 할 일 설계 (1·3·7·10·25·30·50)
        { key: "routine_first", category: "routine", metric: "created_tasks", threshold: 1, title: "첫 루틴", description: "첫 할 일을 만들고 시작을 준비했어요.", icon: "🌱" },
        { key: "routine_designer", category: "routine", metric: "created_tasks", threshold: 3, title: "루틴 설계자", description: "할 일 3개로 하루의 흐름을 정했어요.", icon: "📐" },
        { key: "routine_7", category: "routine", metric: "created_tasks", threshold: 7, title: "하루 설계 완성", description: "할 일 7개로 하루치 계획을 세웠어요.", icon: "🗓" },
        { key: "routine_system", category: "routine", metric: "created_tasks", threshold: 10, title: "나만의 시스템", description: "할 일 10개로 루틴을 구성했어요.", icon: "🧩" },
        { key: "routine_master", category: "routine", metric: "created_tasks", threshold: 25, title: "루틴 마스터", description: "할 일 25개로 하루 전체를 루틴으로 꾸몄어요.", icon: "🏛" },
        { key: "routine_30", category: "routine", metric: "created_tasks", threshold: 30, title: "루틴 컬렉터", description: "할 일 30개를 모아 루틴을 꾸몄어요.", icon: "🗂" },
        { key: "routine_50", category: "routine", metric: "created_tasks", threshold: 50, title: "무한 루틴", description: "할 일 50개로 루틴 목록을 완성했어요.", icon: "🌀" },
        # 꾸준함: 활동한 날 (1·3·7·10·30·60·100·250·365)
        { key: "steady_1d", category: "steady", metric: "activity_days", threshold: 1, title: "첫 기록", description: "처음으로 하루를 기록했어요.", icon: "📌" },
        { key: "steady_3d", category: "steady", metric: "activity_days", threshold: 3, title: "시작 3일", description: "3일 동안 하루를 기록했어요.", icon: "⭐" },
        { key: "steady_7d", category: "steady", metric: "activity_days", threshold: 7, title: "첫 주 완주", description: "7일 동안 하루도 빠지지 않았어요.", icon: "🌈" },
        { key: "steady_10d", category: "steady", metric: "activity_days", threshold: 10, title: "첫 10일", description: "10일 동안 하루를 기록했어요.", icon: "🔥" },
        { key: "steady_30d", category: "steady", metric: "activity_days", threshold: 30, title: "꾸준한 한 달", description: "30일 동안 하루 목표를 달성했어요.", icon: "🏅" },
        { key: "steady_60d", category: "steady", metric: "activity_days", threshold: 60, title: "두 달의 리듬", description: "60일 동안 하루를 기록했어요.", icon: "🌞" },
        { key: "steady_100d", category: "steady", metric: "activity_days", threshold: 100, title: "100일의 발자국", description: "100일 동안 하루도 잃지 않았어요.", icon: "👣" },
        { key: "steady_250d", category: "steady", metric: "activity_days", threshold: 250, title: "250일의 여정", description: "250일 동안 꾸준히 기록했어요.", icon: "🌠" },
        { key: "steady_365d", category: "steady", metric: "activity_days", threshold: 365, title: "일 년의 발자국", description: "365일 동안 하루도 빠짐없이 기록했어요.", icon: "📅" },
        # 꾸준함: 완료한 할 일 (1·3·7·10·25·30·50·200·1000)
        { key: "steady_done_1", category: "steady", metric: "completed_tasks", threshold: 1, title: "첫 완료", description: "할 일을 처음으로 끝냈어요.", icon: "🎉" },
        { key: "steady_done_3", category: "steady", metric: "completed_tasks", threshold: 3, title: "완료의 걸음", description: "할 일 3개를 끝냈어요.", icon: "🚶" },
        { key: "steady_done_7", category: "steady", metric: "completed_tasks", threshold: 7, title: "완료의 리듬", description: "할 일 7개를 완료했어요.", icon: "🥁" },
        { key: "steady_done_10", category: "steady", metric: "completed_tasks", threshold: 10, title: "열 가지 해냄", description: "할 일 10개를 완료했어요.", icon: "🔟" },
        { key: "steady_done_25", category: "steady", metric: "completed_tasks", threshold: 25, title: "25개 돌파", description: "할 일 25개를 완료했어요.", icon: "🖇" },
        { key: "steady_done_30", category: "steady", metric: "completed_tasks", threshold: 30, title: "서른 개 완료", description: "할 일 30개를 완료했어요.", icon: "🧾" },
        { key: "steady_done_50", category: "steady", metric: "completed_tasks", threshold: 50, title: "완료의 시작", description: "할 일 50개를 끝까지 해냈어요.", icon: "✅" },
        { key: "steady_done_200", category: "steady", metric: "completed_tasks", threshold: 200, title: "완료가 습관으로", description: "할 일 200개를 완료했어요.", icon: "🧱" },
        { key: "steady_done_1000", category: "steady", metric: "completed_tasks", threshold: 1000, title: "천 개의 완료", description: "할 일 1000개를 완료하는 대기록을 세웠어요.", icon: "🗿" },
        # 집중: 누적 시간 (1·3·5·7·10·25·30·50·100·200시간)
        { key: "focus_1h", category: "focus", metric: "focus_minutes", threshold: 60, title: "첫 1시간", description: "집중 시간 1시간을 채웠어요.", icon: "🕯" },
        { key: "focus_3h", category: "focus", metric: "focus_minutes", threshold: 180, title: "세 시간 몰입", description: "집중 시간 3시간을 채웠어요.", icon: "⚡" },
        { key: "focus_5h", category: "focus", metric: "focus_minutes", threshold: 300, title: "집중의 문턱", description: "집중 시간 5시간을 채웠어요.", icon: "🌤" },
        { key: "focus_7h", category: "focus", metric: "focus_minutes", threshold: 420, title: "하루치 집중", description: "집중 시간 7시간을 채웠어요.", icon: "☕" },
        { key: "focus_10h", category: "focus", metric: "focus_minutes", threshold: 600, title: "첫 10시간", description: "집중 시간 10시간을 채웠어요.", icon: "⏱" },
        { key: "focus_25h", category: "focus", metric: "focus_minutes", threshold: 1500, title: "25시간의 몰입", description: "누적 집중 25시간을 달성했어요.", icon: "🌙" },
        { key: "focus_30h", category: "focus", metric: "focus_minutes", threshold: 1800, title: "30시간 돌파", description: "누적 집중 30시간을 채웠어요.", icon: "🪐" },
        { key: "focus_50h", category: "focus", metric: "focus_minutes", threshold: 3000, title: "몰입의 시간", description: "누적 집중 50시간을 달성했어요.", icon: "⏳" },
        { key: "focus_100h", category: "focus", metric: "focus_minutes", threshold: 6000, title: "백 시간의 몰입", description: "집중 시간 100시간을 채웠어요.", icon: "🧘" },
        { key: "focus_200h", category: "focus", metric: "focus_minutes", threshold: 12000, title: "시간의 설계자", description: "누적 집중 200시간을 달성했어요.", icon: "🏔" },
        # 지원 (1·3·5·7·10·20·30·50·100·200건)
        { key: "apply_1", category: "apply", metric: "application_completions", threshold: 1, title: "첫 지원", description: "지원 활동을 첫 건 기록했어요.", icon: "📮" },
        { key: "apply_3", category: "apply", metric: "application_completions", threshold: 3, title: "첫 발 떼기", description: "지원 활동 3건을 기록했어요.", icon: "🛫" },
        { key: "apply_5", category: "apply", metric: "application_completions", threshold: 5, title: "첫 지원 5건", description: "지원 활동을 5건 기록했어요.", icon: "✉" },
        { key: "apply_7", category: "apply", metric: "application_completions", threshold: 7, title: "한 주 지원", description: "지원 활동 7건을 기록했어요.", icon: "📬" },
        { key: "apply_10", category: "apply", metric: "application_completions", threshold: 10, title: "지원 10건", description: "지원 활동 10건을 기록했어요.", icon: "📨" },
        { key: "apply_20", category: "apply", metric: "application_completions", threshold: 20, title: "기회의 문을 열다", description: "지원 활동 20건을 기록했어요.", icon: "🚪" },
        { key: "apply_30", category: "apply", metric: "application_completions", threshold: 30, title: "30건의 기회", description: "지원 활동 30건을 기록했어요.", icon: "🗃" },
        { key: "apply_50", category: "apply", metric: "application_completions", threshold: 50, title: "기회의 문을 두드리다", description: "지원 활동 50건을 기록했어요.", icon: "🎯" },
        { key: "apply_100", category: "apply", metric: "application_completions", threshold: 100, title: "백 번째 기회", description: "지원 활동 100건을 기록했어요.", icon: "🚀" },
        { key: "apply_200", category: "apply", metric: "application_completions", threshold: 200, title: "이백 번째 문", description: "지원 활동 200건을 기록했어요.", icon: "🪂" },
        # 알고리즘 (1·3·7·10·25·30·50·100·300·500문제)
        { key: "algo_1", category: "algorithm", metric: "algorithm_completions", threshold: 1, title: "첫 문제 해결", description: "알고리즘 첫 문제를 풀었어요.", icon: "💡" },
        { key: "algo_3", category: "algorithm", metric: "algorithm_completions", threshold: 3, title: "세 문제 돌파", description: "알고리즘 3문제를 풀었어요.", icon: "🎲" },
        { key: "algo_7", category: "algorithm", metric: "algorithm_completions", threshold: 7, title: "문제 부수기", description: "알고리즘 7문제를 풀었어요.", icon: "🔨" },
        { key: "algo_10", category: "algorithm", metric: "algorithm_completions", threshold: 10, title: "문제 해결가", description: "알고리즘 10문제를 풀었어요.", icon: "🧠" },
        { key: "algo_25", category: "algorithm", metric: "algorithm_completions", threshold: 25, title: "25문제 돌파", description: "알고리즘 25문제를 풀었어요.", icon: "🧮" },
        { key: "algo_30", category: "algorithm", metric: "algorithm_completions", threshold: 30, title: "30문제 채우기", description: "알고리즘 30문제를 풀었어요.", icon: "⌨" },
        { key: "algo_50", category: "algorithm", metric: "algorithm_completions", threshold: 50, title: "디버거", description: "알고리즘 50문제를 풀었어요.", icon: "⚔" },
        { key: "algo_100", category: "algorithm", metric: "algorithm_completions", threshold: 100, title: "알고리즘 마스터", description: "알고리즘 100문제를 풀었어요.", icon: "👑" },
        { key: "algo_300", category: "algorithm", metric: "algorithm_completions", threshold: 300, title: "코드 장인", description: "알고리즘 300문제를 풀었어요.", icon: "⚒" },
        { key: "algo_500", category: "algorithm", metric: "algorithm_completions", threshold: 500, title: "코드의 신", description: "알고리즘 500문제를 풀었어요.", icon: "🎖" },
        # 포트폴리오 (1·3·7·10·25·30·60·100회)
        { key: "portfolio_1", category: "portfolio", metric: "portfolio_completions", threshold: 1, title: "첫 초안", description: "포트폴리오·이력서를 처음 다듬었어요.", icon: "📝" },
        { key: "portfolio_3", category: "portfolio", metric: "portfolio_completions", threshold: 3, title: "세 번의 다듬기", description: "포트폴리오·이력서를 3회 다듬었어요.", icon: "🧷" },
        { key: "portfolio_7", category: "portfolio", metric: "portfolio_completions", threshold: 7, title: "한 주 다듬기", description: "포트폴리오·이력서를 7회 다듬었어요.", icon: "🪡" },
        { key: "portfolio_10", category: "portfolio", metric: "portfolio_completions", threshold: 10, title: "다듬고 또 다듬기", description: "포트폴리오·이력서를 10회 다듬었어요.", icon: "🖌" },
        { key: "portfolio_25", category: "portfolio", metric: "portfolio_completions", threshold: 25, title: "25회 다듬기", description: "포트폴리오·이력서를 25회 다듬었어요.", icon: "🧶" },
        { key: "portfolio_30", category: "portfolio", metric: "portfolio_completions", threshold: 30, title: "완성된 이야기", description: "포트폴리오·이력서를 30회 다듬었어요.", icon: "💎" },
        { key: "portfolio_60", category: "portfolio", metric: "portfolio_completions", threshold: 60, title: "60회 다듬기", description: "포트폴리오·이력서를 60회 다듬었어요.", icon: "🎞" },
        { key: "portfolio_100", category: "portfolio", metric: "portfolio_completions", threshold: 100, title: "백 번째 다듬기", description: "포트폴리오·이력서를 100회 다듬었어요.", icon: "🏆" }
      ]
    end
  end
end

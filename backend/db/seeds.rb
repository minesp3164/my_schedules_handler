require "digest"

# 회사 자동완성용 실존 목록(시드) — DART 키가 있으면 이후 동기화로 보강된다.
Companies::SeedDefaults.call

Device.find_or_create_by!(installation_id: "development-device") do |device|
  device.name = "Local development device"
  device.platform = "web"
  device.access_token_digest = Digest::SHA256.hexdigest("development-token")
end

[
  ["집중 세션 25분", 10, 2, "focus"],
  ["알고리즘 1문제", 1, 1, "algorithm"],
  ["이력서/포트폴리오 개선", 20, 1, "portfolio"],
  ["실제 지원 1건", 25, 1, "application"]
].each_with_index do |(title, points, target_count, kind), position|
  TaskTemplate.find_or_create_by!(title: title) do |task|
    task.points = points
    task.target_count = target_count
    task.position = position
    task.kind = kind
  end
end

require "digest"

Device.find_or_create_by!(installation_id: "development-device") do |device|
  device.name = "Local development device"
  device.platform = "web"
  device.access_token_digest = Digest::SHA256.hexdigest("development-token")
end

[
  ["집중 세션 25분", 10, 2, "focus"],
  ["알고리즘 1문제", 15, 1, "algorithm"],
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

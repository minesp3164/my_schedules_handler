require "xcodeproj"

project_path = File.expand_path("../ios/tracker.xcodeproj", __dir__)
project = Xcodeproj::Project.open(project_path)
app_target = project.targets.find { |target| target.name == "tracker" }
widget_target = project.targets.find { |target| target.name == "TodayPointsWidget" }

abort "tracker target not found" unless app_target

def file_reference(group, path)
  group.files.find { |file| file.path == path } || group.new_file(path)
end

app_group = project.main_group["tracker"]
widget_group = project.main_group["TodayPointsWidget"] || project.main_group.new_group("TodayPointsWidget", "TodayPointsWidget")

unless widget_target
  widget_target = project.new_target(:app_extension, "TodayPointsWidget", :ios, "16.4")
  widget_target.product_reference.path = "TodayPointsWidget.appex"

  widget_target.build_configurations.each do |configuration|
    configuration.build_settings["PRODUCT_BUNDLE_IDENTIFIER"] = "com.minesp.shcedule-handler.TodayPointsWidget"
    configuration.build_settings["PRODUCT_NAME"] = "TodayPointsWidget"
    configuration.build_settings["DEVELOPMENT_TEAM"] = "FB8CAYQA53"
    configuration.build_settings["IPHONEOS_DEPLOYMENT_TARGET"] = "16.4"
    configuration.build_settings["SWIFT_VERSION"] = "5.0"
    configuration.build_settings["INFOPLIST_FILE"] = "TodayPointsWidget/Info.plist"
    configuration.build_settings["CODE_SIGN_ENTITLEMENTS"] = "TodayPointsWidget/TodayPointsWidget.entitlements"
    configuration.build_settings["SKIP_INSTALL"] = "YES"
  end

  ["TodayPointsWidget.swift", "TodayPointsWidgetBundle.swift"].each do |path|
    widget_target.add_file_references([file_reference(widget_group, path)])
  end

  app_target.add_dependency(widget_target)
  embed_phase = app_target.copy_files_build_phases.find { |phase| phase.name == "Embed App Extensions" }
  embed_phase ||= app_target.new_copy_files_build_phase("Embed App Extensions")
  embed_phase.symbol_dst_subfolder_spec = :plug_ins
  embed_phase.add_file_reference(widget_target.product_reference, true)
end

["TodayPointsWidget.swift", "TodayPointsWidgetBridge.m"].each do |path|
  reference = file_reference(app_group, "tracker/#{path}")
  app_target.add_file_references([reference]) unless app_target.source_build_phase.files_references.include?(reference)
end

project.save

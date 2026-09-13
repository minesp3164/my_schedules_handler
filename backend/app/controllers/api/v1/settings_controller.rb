module Api
  module V1
    class SettingsController < BaseController
      def show
        render json: { data: settings_payload(Setting.instance), meta: { revision: Realtime::Publish.current_revision, server_time: Time.current } }
      end

      def update
        setting = Setting.instance
        setting.update!(settings_params)
        Rewards::SyncDefaultRules.call(user: current_user, setting: setting)
        revision = Realtime::Publish.call(event: "settings.updated", data: {}).revision
        render json: { data: settings_payload(setting), meta: { revision: revision, server_time: Time.current } }
      end

      private

      def settings_params
        params.require(:settings).permit(
          :focus_minutes,
          :break_minutes,
          :nudge_enabled,
          :nudge_at,
          :focus_completion_points,
          :daily_bonus_points,
          :daily_reward_points,
          :weekly_reward_points,
          :daily_reward_text,
          :weekly_reward_text
        )
      end

      def settings_payload(setting)
        setting.slice(
          :focus_minutes,
          :break_minutes,
          :nudge_enabled,
          :nudge_at,
          :timezone,
          :focus_completion_points,
          :daily_bonus_points,
          :daily_reward_points,
          :weekly_reward_points,
          :daily_reward_text,
          :weekly_reward_text
        )
      end
    end
  end
end

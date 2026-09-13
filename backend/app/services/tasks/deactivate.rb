module Tasks
  class Deactivate
    Result = Data.define(:task, :summaries, :changed)

    def self.call(...)
      new(...).call
    end

    def initialize(task_template_id:, user:)
      @task_template_id = task_template_id
      @user = user
    end

    def call
      TaskTemplate.transaction do
        task = @user.task_templates.lock.find(@task_template_id)
        return Result.new(task, [], false) unless task.active?

        completion_ids = task.daily_task_completions.active.lock.pluck(:id)
        summaries = completion_ids.filter_map do |completion_id|
          _completion, summary, changed = Tasks::Revert.call(completion_id: completion_id)
          summary if changed
        end

        task.update!(active: false)
        Result.new(task, summaries.uniq(&:date), true)
      end
    end
  end
end

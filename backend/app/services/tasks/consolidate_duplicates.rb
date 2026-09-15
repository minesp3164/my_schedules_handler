module Tasks
  class ConsolidateDuplicates
    def self.call(...)
      new(...).call
    end

    def initialize(user:)
      @user = user
    end

    def call
      TaskTemplate.transaction do
        @user.task_templates.active_in_order.to_a.group_by { |task| signature(task) }.each_value do |tasks|
          merge(tasks) if tasks.size > 1
        end
      end
    end

    private

    def signature(task)
      [task.title, task.kind, task.weekdays.sort]
    end

    def merge(tasks)
      primary, *duplicates = tasks
      duplicates.each do |duplicate|
        move_completions(duplicate, primary)
        duplicate.update!(active: false)
      end
      total_count = tasks.sum(&:target_count)
      primary.update!(target_count: total_count, points: points_for(primary.kind, total_count))
    end

    def move_completions(from, to)
      from.daily_task_completions.order(:completed_on, :sequence).group_by(&:completed_on).each do |date, completions|
        next_sequence = to.daily_task_completions.where(completed_on: date).maximum(:sequence).to_i
        completions.each do |completion|
          next_sequence += 1
          completion.update!(task_template: to, sequence: next_sequence)
        end
      end
    end

    def points_for(kind, target_count)
      base = Api::V1::TaskTemplatesController::DEFAULT_POINTS.fetch(kind, 10)
      return base if %w[portfolio application].include?(kind)

      base * target_count
    end
  end
end

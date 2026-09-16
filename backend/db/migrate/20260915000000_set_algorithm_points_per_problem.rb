class SetAlgorithmPointsPerProblem < ActiveRecord::Migration[8.1]
  def up
    execute "UPDATE task_templates SET points = target_count WHERE kind = 'algorithm'"
  end

  def down
    execute "UPDATE task_templates SET points = target_count * 15 WHERE kind = 'algorithm'"
  end
end

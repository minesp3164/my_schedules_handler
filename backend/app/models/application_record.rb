class ApplicationRecord < ActiveRecord::Base
  primary_abstract_class

  before_create :assign_uuid_primary_key

  private

  def assign_uuid_primary_key
    self.id = SecureRandom.uuid if self.class.primary_key == "id" && id.blank?
  end
end

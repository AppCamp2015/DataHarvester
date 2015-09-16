class CreateSearches < ActiveRecord::Migration
  def change
    create_table :searches do |t|
      t.string :name
      t.string :splunkquery
      t.integer :user_id

      t.timestamps null: false
    end
  end
end

Rails.application.routes.draw do
  mount ActionCable.server => "/cable"

  namespace :api do
    namespace :v1 do
      post "devices/activate", to: "devices#activate"
      delete "devices/current", to: "device_connections#destroy"
      get "dashboard", to: "dashboard#show"
      get "history", to: "histories#index"
      resource :settings, only: %i[show update]
      resource :push_subscription, only: :create
      post "push-subscriptions", to: "push_subscriptions#create"
      get "focus-sessions/current", to: "focus_sessions#current"
      resources :focus_sessions, path: "focus-sessions", only: :create do
        member do
          patch :pause
          patch :resume
          patch :complete
          patch :cancel
        end
      end
      resources :task_templates, only: %i[index create update destroy] do
        resources :completions, only: :create, module: :task_templates
      end
      resources :completions, only: :destroy
    end
  end

  get "/up", to: proc { [200, { "content-type" => "application/json" }, ["{\"status\":\"ok\"}"]] }
end

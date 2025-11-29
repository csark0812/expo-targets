import Intents

class IntentHandler: INExtension, INStartWorkoutIntentHandling, INPauseWorkoutIntentHandling, INEndWorkoutIntentHandling, INResumeWorkoutIntentHandling {

    override func handler(for intent: INIntent) -> Any {
        switch intent {
        case is INStartWorkoutIntent,
             is INPauseWorkoutIntent,
             is INEndWorkoutIntent,
             is INResumeWorkoutIntent:
            return self
        default:
            fatalError("Unhandled intent type: \(intent)")
        }
    }

    // MARK: - INStartWorkoutIntent

    func handle(intent: INStartWorkoutIntent, completion: @escaping (INStartWorkoutIntentResponse) -> Void) {
        let workoutName = intent.workoutName?.spokenPhrase ?? "workout"
        let response = INStartWorkoutIntentResponse(code: .continueInApp, userActivity: nil)

        let userActivity = NSUserActivity(activityType: "com.test.alltargetsdemo.startWorkout")
        userActivity.title = "Start \(workoutName)"
        userActivity.userInfo = ["workoutName": workoutName]

        response.userActivity = userActivity
        completion(response)
    }

    func resolveWorkoutName(for intent: INStartWorkoutIntent, with completion: @escaping (INSpeakableStringResolutionResult) -> Void) {
        if let workoutName = intent.workoutName {
            completion(INSpeakableStringResolutionResult.success(with: workoutName))
        } else {
            completion(INSpeakableStringResolutionResult.needsValue())
        }
    }

    func confirm(intent: INStartWorkoutIntent, completion: @escaping (INStartWorkoutIntentResponse) -> Void) {
        completion(INStartWorkoutIntentResponse(code: .ready, userActivity: nil))
    }

    // MARK: - INPauseWorkoutIntent

    func handle(intent: INPauseWorkoutIntent, completion: @escaping (INPauseWorkoutIntentResponse) -> Void) {
        let response = INPauseWorkoutIntentResponse(code: .continueInApp, userActivity: nil)

        let userActivity = NSUserActivity(activityType: "com.test.alltargetsdemo.pauseWorkout")
        userActivity.title = "Pause workout"

        response.userActivity = userActivity
        completion(response)
    }

    func confirm(intent: INPauseWorkoutIntent, completion: @escaping (INPauseWorkoutIntentResponse) -> Void) {
        completion(INPauseWorkoutIntentResponse(code: .ready, userActivity: nil))
    }

    // MARK: - INEndWorkoutIntent

    func handle(intent: INEndWorkoutIntent, completion: @escaping (INEndWorkoutIntentResponse) -> Void) {
        let response = INEndWorkoutIntentResponse(code: .continueInApp, userActivity: nil)

        let userActivity = NSUserActivity(activityType: "com.test.alltargetsdemo.endWorkout")
        userActivity.title = "End workout"

        response.userActivity = userActivity
        completion(response)
    }

    func confirm(intent: INEndWorkoutIntent, completion: @escaping (INEndWorkoutIntentResponse) -> Void) {
        completion(INEndWorkoutIntentResponse(code: .ready, userActivity: nil))
    }

    // MARK: - INResumeWorkoutIntent

    func handle(intent: INResumeWorkoutIntent, completion: @escaping (INResumeWorkoutIntentResponse) -> Void) {
        let response = INResumeWorkoutIntentResponse(code: .continueInApp, userActivity: nil)

        let userActivity = NSUserActivity(activityType: "com.test.alltargetsdemo.resumeWorkout")
        userActivity.title = "Resume workout"

        response.userActivity = userActivity
        completion(response)
    }

    func confirm(intent: INResumeWorkoutIntent, completion: @escaping (INResumeWorkoutIntentResponse) -> Void) {
        completion(INResumeWorkoutIntentResponse(code: .ready, userActivity: nil))
    }
}

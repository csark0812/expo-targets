import IntentsUI

class IntentViewController: UIViewController, INUIHostedViewControlling {

    private let messageLabel: UILabel = {
        let label = UILabel()
        label.textAlignment = .center
        label.numberOfLines = 0
        label.font = .systemFont(ofSize: 18, weight: .medium)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    private let iconLabel: UILabel = {
        let label = UILabel()
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 48)
        label.translatesAutoresizingMaskIntoConstraints = false
        return label
    }()

    override func viewDidLoad() {
        super.viewDidLoad()

        let stackView = UIStackView(arrangedSubviews: [iconLabel, messageLabel])
        stackView.axis = .vertical
        stackView.spacing = 16
        stackView.alignment = .center
        stackView.translatesAutoresizingMaskIntoConstraints = false

        view.addSubview(stackView)

        NSLayoutConstraint.activate([
            stackView.centerXAnchor.constraint(equalTo: view.centerXAnchor),
            stackView.centerYAnchor.constraint(equalTo: view.centerYAnchor),
            stackView.leadingAnchor.constraint(greaterThanOrEqualTo: view.leadingAnchor, constant: 20),
            stackView.trailingAnchor.constraint(lessThanOrEqualTo: view.trailingAnchor, constant: -20)
        ])
    }

    func configureView(for parameters: Set<INParameter>, of interaction: INInteraction, interactiveBehavior: INUIInteractiveBehavior, context: INUIHostedViewContext, completion: @escaping (Bool, Set<INParameter>, CGSize) -> Void) {

        let intent = interaction.intent

        switch intent {
        case let startIntent as INStartWorkoutIntent:
            let workoutName = startIntent.workoutName?.spokenPhrase ?? "workout"
            iconLabel.text = "🏃‍♂️"
            messageLabel.text = "Starting \(workoutName)"

        case is INPauseWorkoutIntent:
            iconLabel.text = "⏸️"
            messageLabel.text = "Pausing workout"

        case is INEndWorkoutIntent:
            iconLabel.text = "🏁"
            messageLabel.text = "Ending workout"

        case is INResumeWorkoutIntent:
            iconLabel.text = "▶️"
            messageLabel.text = "Resuming workout"

        default:
            completion(false, parameters, .zero)
            return
        }

        let desiredSize = CGSize(width: view.bounds.width, height: 120)
        completion(true, parameters, desiredSize)
    }
}


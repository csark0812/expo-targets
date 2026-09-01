# Community and adoption

**Source of truth for** public adoption evidence for expo-targets.

<!-- doc-meta: owner=eng | last-reviewed=2026-08-31 -->

This page records claims that can be checked against public sources. It distinguishes implementation reports, maintenance outcomes, external recognition, and download activity. None of the evidence below establishes a named company's production deployment.

## Evidence snapshot

Verified on 2026-08-31.

| Signal | Snapshot | Source | What it establishes |
| --- | ---: | --- | --- |
| npm download events, latest 30-day window | 6,550 (2026-07-31 through 2026-08-29) | [npm downloads API](https://api.npmjs.org/downloads/point/last-month/expo-targets) | Registry download activity, not unique users or installations |
| npm download events, trailing year | 13,992 (2025-08-30 through 2026-08-29) | [npm downloads API](https://api.npmjs.org/downloads/point/last-year/expo-targets) | Registry download activity, not retention or production use |
| GitHub stars | 96 | [Repository](https://github.com/csark0812/expo-targets) | Public interest |
| GitHub releases | 38 | [Releases](https://github.com/csark0812/expo-targets/releases) | Published maintenance history |

## Public implementation report

In [issue #15](https://github.com/csark0812/expo-targets/issues/15), [kitze](https://github.com/kitze) wrote:

> "Thank you for the amazing library. I implemented widgets and love it already!"

The same thread later reported EAS build trouble and temporarily moved the widget work to another branch. The maintainer reproduced the EAS failure and released a fix in `0.2.5`. The thread supports a public implementation report and maintenance response; it does not confirm that the implementation later shipped to production.

## Maintenance loop

[Issue #14](https://github.com/csark0812/expo-targets/issues/14) reported an incorrect module path on 2025-11-29. A new package version was published that day, and the reporter confirmed: ["Fixed. Thank you!"](https://github.com/csark0812/expo-targets/issues/14#issuecomment-3591584321)

This establishes a publicly visible report-to-release-to-confirmation loop. It does not establish the reporter's deployment environment.

## External recognition

- [This Week in React #261](https://github.com/slorber/this-week-in-react/blob/main/website/newsletter/261/index.mdx) included Expo Targets in its React Native package roundup.
- The [React Native Community Directory compatibility data](https://github.com/react-native-community/directory/blob/main/assets/check-data.json) includes `expo-targets` with New Architecture support recorded.
- The independent [React Native iOS widgets blueprint](https://github.com/alexklyuev/rn-ios-widgets-blueprint/blob/main/README.md) includes `expo-targets` in its implementation plan.

These are independent references. They are not testimonials, customer endorsements, or proof of production deployment.

## Evidence boundary

- **Confirmed production use** requires an explicit, attributable public statement that expo-targets is used in production.
- **Public implementation report** means a developer publicly said they implemented or used the package.
- **External recognition** means an independent public source included the package.
- **Download activity** counts npm download events, not people, applications, or companies.

Have a public implementation to share? Use the [project showcase form](https://github.com/csark0812/expo-targets/issues/new?template=showcase.yml). Submissions are not described as production use unless the submission includes public supporting evidence and permission to quote it.

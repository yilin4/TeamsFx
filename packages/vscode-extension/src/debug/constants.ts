// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

import { defaultHelpLink } from "@microsoft/teamsfx-core/build/common/deps-checker";
import { ExtensionErrors } from "../error";

export const openWenClientCommand = "launch Teams web client";
export const npmRunDevRegex = /npm[\s]+run[\s]+dev/im;

export const frontendProblemMatcher = "$teamsfx-frontend-watch";
export const backendProblemMatcher = "$teamsfx-backend-watch";
export const authProblemMatcher = "$teamsfx-auth-watch";
export const ngrokProblemMatcher = "$teamsfx-ngrok-watch";
export const botProblemMatcher = "$teamsfx-bot-watch";
export const tscWatchProblemMatcher = "$tsc-watch";

export const localSettingsJsonName = "localSettings.json";

export const frontendLocalEnvPrefix = "FRONTEND_";
export const backendLocalEnvPrefix = "BACKEND_";
export const authLocalEnvPrefix = "AUTH_";
export const authServicePathEnvKey = "AUTH_SERVICE_PATH";
export const botLocalEnvPrefix = "BOT_";

export const issueChooseLink = "https://github.com/OfficeDev/TeamsFx/issues/new/choose";
export const issueLink = "https://github.com/OfficeDev/TeamsFx/issues/new?";
export const issueTemplate = `
**Describe the bug**
A clear and concise description of what the bug is.

**To Reproduce**
Steps to reproduce the behavior:
1. Go to '...'
2. Click on '....'
3. Scroll down to '....'
4. See error

**Expected behavior**
A clear and concise description of what you expected to happen.

**Screenshots**
If applicable, add screenshots to help explain your problem.

**VS Code Extension Information (please complete the following information):**
 - OS: [e.g. iOS]
 - Version [e.g. 22]

**Additional context**
Add any other context about the problem here.
`;
export const errorDetail = `
**Error detail**
`;

export enum PortWarningStateKeys {
  DoNotShowAgain = "localDebugPortWarning/doNotShowAgain",
}

export const localDebugHelpDoc = "https://aka.ms/teamsfx-localdebug";
export const portInUseHelpLink = "https://aka.ms/teamsfx-port-in-use";
export const skipNgrokHelpLink = "https://aka.ms/teamsfx-skip-ngrok";
export const trustDevCertHelpLink = "https://aka.ms/teamsfx-trust-dev-cert";
export const m365AppsPrerequisitesHelpLink = "https://aka.ms/teamsfx-m365-apps-prerequisites";

export const skipNgrokRetiredNotification =
  "Property 'skipNgrok' in '.fx/configs/localSettings.json' has been retired. Use 'fx-extension.prerequisiteCheck.ngrok' in VSCode settings instead.";
export const trustDevCertRetiredNotification =
  "Property 'trustDevCert' in '.fx/configs/localSettings.json' has been retired. Use 'fx-extension.prerequisiteCheck.devCert' in VSCode settings instead.";

export enum Hub {
  teams = "Teams",
  outlook = "Outlook",
  office = "Office",
}

export enum Host {
  teams = "teams.microsoft.com",
  outlook = "outlook.office.com",
  office = "www.office.com",
}

export class LaunchUrl {
  public static readonly teams: string =
    "https://teams.microsoft.com/l/app/${teamsAppId}?installAppPackage=true&webjoin=true&${account-hint}";
  public static readonly outlookTab: string =
    "https://outlook.office.com/host/${teamsAppInternalId}?${account-hint}";
  public static readonly outlookBot: string = "https://outlook.office.com/mail?${account-hint}";
  public static readonly officeTab: string =
    "https://www.office.com/m365apps/${teamsAppInternalId}?auth=2&${account-hint}";
}

export const teamsAppIdPlaceholder = "${teamsAppId}";
export const teamsAppInternalIdPlaceholder = "${teamsAppInternalId}";
export const accountHintPlaceholder = "${account-hint}";

export const openOutputPanelCommand = "command:fx-extension.showOutputChannel";
export const openTerminalCommand = "command:workbench.action.terminal.focus";

export type DisplayMessages = {
  taskName: string;
  title: string;
  checkNumber: string;
  summary: string;
  learnMore: string;
  learnMoreHelpLink: string;
  launchServices?: string;
  errorName: string;
  errorMessageKey: string;
  errorDisplayMessageKey: string;
  errorMessageLink: string;
  errorHelpLink: string;
  errorMessageCommand: string;
};

const basePrerequisiteCheckDisplayMessages = {
  taskName: "Prerequisites Check",
  checkNumber:
    "(Totally @number steps) Teams Toolkit is checking if all required prerequisites are installed and will install them if not.",
  errorName: ExtensionErrors.PrerequisitesValidationError,
  errorMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prerequisitesCheckFailure",
  errorMessageCommand: openOutputPanelCommand,
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
};

export const prerequisiteCheckDisplayMessages: DisplayMessages = Object.assign(
  {
    title: "Prerequisites Check",
    summary: "Prerequisites Check Summary:",
    learnMore: "Visit @Link to learn more about prerequisites check.",
    learnMoreHelpLink: defaultHelpLink,
    errorHelpLink: "https://aka.ms/teamsfx-envchecker-help",
    launchServices:
      "Services will be launched locally, please check your terminal window for details.",
  },
  basePrerequisiteCheckDisplayMessages
);

export const prerequisiteCheckForGetStartedDisplayMessages: DisplayMessages = Object.assign(
  {
    title: "Get Started Prerequisites Check",
    summary: "Get Started Prerequisites Check Summary:",
    learnMore: "Visit @Link to learn more about get started prerequisites check.",
    learnMoreHelpLink: defaultHelpLink,
    errorHelpLink: "https://aka.ms/teamsfx-envchecker-help",
  },
  basePrerequisiteCheckDisplayMessages
);

export const prerequisiteCheckTaskDisplayMessages: DisplayMessages = Object.assign(
  {
    title: 'Running "Validate & Install Prerequisites" Visual Studio Code task.',
    summary: "Validate & Install Prerequisites Summary:",
    learnMore: 'Visit @Link to learn more about "Validate & Install Prerequisites" task.',
    learnMoreHelpLink: "https://aka.ms/teamsfx-check-prerequisites-task", // TODO: update npm install help link
    errorHelpLink: "https://aka.ms/teamsfx-check-prerequisites-task", // TODO: update npm install help link
  },
  basePrerequisiteCheckDisplayMessages
);

export const npmInstallDisplayMessages: DisplayMessages = {
  taskName: "Install NPM packages",
  title: 'Running "Install NPM packages" Visual Studio Code task.',
  checkNumber:
    "(Totally @number steps) Teams Toolkit is checking if all the NPM packages are installed and will install them if not.",
  summary: "Install NPM Packages Summary:",
  learnMore: 'Visit @Link to learn more about "Install NPM packages" task.',
  learnMoreHelpLink: "https://aka.ms/teamsfx-npm-package-task", // TODO: update npm install help link
  errorName: ExtensionErrors.PrerequisitesInstallPackagesError,
  errorMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.npmInstallFailure",
  errorMessageCommand: openTerminalCommand,
  errorMessageLink: "teamstoolkit.localDebug.terminal",
  errorHelpLink: "https://aka.ms/teamsfx-npm-package-task", // TODO: update npm install help link
};

export const localTunnelDisplayMessages = Object.freeze({
  taskName: "Start local tunnel",
  title: 'Running "Start local tunnel" Visual Studio Code task.',
  check:
    "Teams Toolkit is starting the local tunnel service. It will tunnel local ports to public URLs and inspect traffic.",
  stepMessage: (tunnelName: string, configFile: string) =>
    `Starting ${tunnelName} tunnel using configuration file '${configFile}'`,
  summary: "Start Local Tunnel Summary:",
  successSummary: (src: string, dist: string) => `Tunneling ${src} -> ${dist}`,
  learnMore: (link: string) => `Visit ${link} to learn more about "Start local tunnel" task.`,
  learnMoreHelpLink: "https://aka.ms/teamsfx-local-tunnel-task", // TODO: update local tunnel help link
  startMessage: "Starting local tunnel service.",
  successMessage: "Local tunnel service is started successfully.",
  errorMessage: "Failed to start local tunnel service.",
});

export const setUpTabDisplayMessages: DisplayMessages = {
  taskName: "Set up Tab",
  title: 'Running "Set up Tab" Visual Studio Code task.',
  checkNumber: "(Totally @number steps) Teams Toolkit is setting up Tab for debugging.",
  summary: "Set up Tab Summary:",
  learnMore: 'Visit @Link to learn more about "Set up Tab" task.',
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab",
  errorName: ExtensionErrors.SetUpTabError,
  errorMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpTabFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-tab",
};

export const setUpBotDisplayMessages: DisplayMessages = {
  taskName: "Set up Bot",
  title: 'Running "Set up Bot" Visual Studio Code task.',
  checkNumber: "(Totally @number steps) Teams Toolkit is setting up Bot for debugging.",
  summary: "Set up Bot Summary:",
  learnMore: 'Visit @Link to learn more about "Set up Bot" task.',
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot",
  errorName: ExtensionErrors.SetUpBotError,
  errorMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpBotFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-bot",
};

export const setUpSSODisplayMessages: DisplayMessages = {
  taskName: "Set up SSO",
  title: 'Running "Set up SSO" Visual Studio Code task.',
  checkNumber: "(Totally @number steps) Teams Toolkit is setting up SSO for debugging.",
  summary: "Set up SSO Summary:",
  learnMore: 'Visit @Link to learn more about "Set up SSO" task.',
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso",
  errorName: ExtensionErrors.SetUpSSOError,
  errorMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.setUpSSOFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-set-up-sso",
};

export const prepareManifestDisplayMessages: DisplayMessages = {
  taskName: "Build and upload Teams manifest",
  title: 'Running "Build and upload Teams manifest" Visual Studio Code task.',
  checkNumber:
    "(Totally @number steps) Teams Toolkit is building and uploading Teams manifest for debugging.",
  summary: "Build and Upload Teams Manifest Summary:",
  learnMore: 'Visit @Link to learn more about "Build and upload Teams manifest" task.',
  learnMoreHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest",
  errorName: ExtensionErrors.PrepareManifestError,
  errorMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorDisplayMessageKey: "teamstoolkit.localDebug.prepareManifestFailure",
  errorMessageCommand: "command:fx-extension.showOutputChannel",
  errorMessageLink: "teamstoolkit.localDebug.outputPanel",
  errorHelpLink: "https://aka.ms/teamsfx-debug-prepare-manifest",
};

export const TaskCommand = Object.freeze({
  checkPrerequisites: "debug-check-prerequisites",
  npmInstall: "debug-npm-install",
  startLocalTunnel: "debug-start-local-tunnel",
  setUpTab: "debug-set-up-tab",
  setUpBot: "debug-set-up-bot",
  setUpSSO: "debug-set-up-sso",
  prepareManifest: "debug-prepare-manifest",
});

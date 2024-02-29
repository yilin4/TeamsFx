/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import * as fs from "fs-extra";
import * as os from 'os';
import * as path from "path";
import * as tmp from "tmp";
import * as vscode from "vscode";

import { ext } from "../extensionVariables";
import { SampleUrlInfo } from '../sample';
import { getCodeToCloudCommand } from "../subCommand/codeToCloudSlashCommand";
import {
  CREATE_SAMPLE_COMMAND_ID,
  createCommand,
  getApiListStringByObject,
  getCreateCommand,
} from "../subCommand/createSlashCommand";
import {
  getFixCommand
} from '../subCommand/fixSlashCommand';
import {
  getAgentHelpCommand,
  helpCommandName,
} from "../subCommand/helpSlashCommand";
import {
  EXECUTE_COMMAND_ID,
  executeCommand,
  getNextStepCommand
} from "../subCommand/nextStepSlashCommand";
import { getTestCommand } from "../subCommand/testCommand";
import { buildFileTree, getSampleFileInfo, modifyFile } from "../util";
import {
  agentDescription,
  agentFullName,
  agentName,
  maxFollowUps,
  wxpAgentDescription,
  wxpAgentFullName,
  wxpAgentName,
} from "./agentConsts";
import {
  LanguageModelID,
  getResponseAsStringCopilotInteraction,
  parseCopilotResponseMaybeWithStrJson,
  verbatimCopilotInteraction
} from "./copilotInteractions";
import { SlashCommandHandlerResult, SlashCommandsOwner } from "./slashCommands";

export interface ITeamsChatAgentResult extends vscode.ChatResult {
  slashCommand?: string;
  sampleIds?: string[];
}

export type CommandVariables = {
  languageModelID?: LanguageModelID;
  chatMessageHistory?: vscode.LanguageModelMessage[];
};

export type AgentRequest = {
  slashCommand?: string;
  userPrompt: string;
  variables: readonly vscode.ChatResolvedVariable[];

  context: vscode.ChatContext;
  response: vscode.ChatExtendedResponseStream;
  token: vscode.CancellationToken;

  commandVariables?: CommandVariables;
};

export interface IAgentRequestHandler {
  handleRequestOrPrompt(
    request: AgentRequest
  ): Promise<SlashCommandHandlerResult>;
  getFollowUpForLastHandledSlashCommand(
    result: vscode.ChatResult,
    token: vscode.CancellationToken
  ): vscode.ChatFollowup[] | undefined;
}

/**
 * Owns slash commands that are knowingly exposed to the user.
 */
const agentSlashCommandsOwner = new SlashCommandsOwner(
  {
    noInput: helpCommandName,
    default: defaultHandler,
  },
  { disableIntentDetection: true }
);
agentSlashCommandsOwner.addInvokeableSlashCommands(
  new Map([
    getCreateCommand(),
    getFixCommand(),
    getNextStepCommand(),
    getAgentHelpCommand(agentSlashCommandsOwner),
    getTestCommand(),
    getCodeToCloudCommand(),
  ])
);

export function registerChatAgent() {
  try {
    const participant = vscode.chat.createChatParticipant(agentName, handler);
    participant.description = agentDescription;
    participant.fullName = agentFullName;
    participant.iconPath = vscode.Uri.joinPath(
      ext.context.extensionUri,
      "resources",
      "teams.png"
    );
    participant.commandProvider = { provideCommands: getCommands };
    participant.followupProvider = { provideFollowups: followUpProvider };
    const wxpParticipant = vscode.chat.createChatParticipant(wxpAgentName, handler);
    wxpParticipant.description = wxpAgentDescription;
    wxpParticipant.fullName = wxpAgentFullName;
    wxpParticipant.iconPath = vscode.Uri.joinPath(
      ext.context.extensionUri,
      "resources",
      "M365.png"
    );
    wxpParticipant.commandProvider = { provideCommands: getCommands };
    wxpParticipant.followupProvider = { provideFollowups: followUpProvider };
    registerVSCodeCommands(participant, wxpParticipant);
    // registerVSCodeCommands(participant);
  } catch (e) {
    console.log(e);
  }
}

async function handler(
  request: vscode.ChatRequest,
  context: vscode.ChatContext,
  response: vscode.ChatExtendedResponseStream,
  token: vscode.CancellationToken
): Promise<vscode.ChatResult | undefined> {
  const agentRequest: AgentRequest = {
    slashCommand: request.command,
    userPrompt: request.prompt,
    variables: request.variables,
    context: context,
    response: response,
    token: token,
  };
  let handleResult: SlashCommandHandlerResult | undefined;

  const handlers = [agentSlashCommandsOwner];
  for (const handler of handlers) {
    handleResult = await handler.handleRequestOrPrompt(agentRequest);
    if (handleResult !== undefined) {
      break;
    }
  }

  if (handleResult !== undefined) {
    handleResult.followUp = handleResult.followUp?.slice(0, maxFollowUps);
    return handleResult.chatAgentResult;
  } else {
    return undefined;
  }
}

function followUpProvider(
  result: ITeamsChatAgentResult,
  token: vscode.CancellationToken
): vscode.ProviderResult<vscode.ChatFollowup[]> {
  const providers = [agentSlashCommandsOwner];

  let followUp: vscode.ChatFollowup[] | undefined;
  for (const provider of providers) {
    followUp = provider.getFollowUpForLastHandledSlashCommand(result, token);
    if (followUp !== undefined) {
      break;
    }
  }
  followUp = followUp ?? [];
  // if (!followUp.find((f) => "message" in f)) {
  //   followUp.push(DefaultNextStep);
  // }
  return followUp;
}

function getCommands(
  context: vscode.ChatContext,
  _token: vscode.CancellationToken
): vscode.ProviderResult<vscode.ChatCommand[]> {
  return agentSlashCommandsOwner.getSlashCommands().map(([name, config]) => ({
    name: name,
    description: config.shortDescription,
  }));
}

async function defaultHandler(
  request: AgentRequest
): Promise<SlashCommandHandlerResult> {
  const regex = /^(?=.*generate)(?=.*code).*/;
  const createRegex = /^(?=.*project)(?=.*snippet).*/;
  let host = "";
  let codeMathToBeInserted = "";
  const srcRoot = os.homedir();
  const defaultTargetFolder = srcRoot ? path.join(srcRoot, "Office-Add-in") : '';
  const tsfilePath = vscode.Uri.file(path.join(defaultTargetFolder, "src", "taskpane", "taskpane.ts"));
  let isFileExist = await fileExists(tsfilePath);
  const lastResponse = getLastResponse(request);
  const tmpTxtPath = path.join(srcRoot, 'tmp.txt');
  // console.log("defaultTargetFolder: " + defaultTargetFolder);
  if (request.userPrompt.toLocaleLowerCase().match(regex)) {
    const objectJson = '{"Annotation":"Represents an annotation attached to a paragraph.","AnnotationCollection":"Contains a collection of Annotation objects.","Body":"Represents the body of a document or a section.","Border":"Represents the Border object for text, a paragraph, or a table.","BorderCollection":"Represents the collection of border styles.","CheckboxContentControl":"The data specific to content controls of type CheckBox.","Comment":"Represents a comment in the document.","CommentCollection":"Contains a collection of Comment objects.","CommentContentRange":"Specifies the comment\'s content range.","CommentReply":"Represents a comment reply in the document.","CommentReplyCollection":"Contains a collection of CommentReply objects. Represents all comment replies in one comment thread.","ContentControl":"Represents a content control. Content controls are bounded and potentially labeled regions in a document that serve as containers for specific types of content. Individual content controls may contain contents such as images, tables, or paragraphs of formatted text. Currently, only rich text, plain text, and checkbox content controls are supported.","ContentControlCollection":"Contains a collection of ContentControl objects. Content controls are bounded and potentially labeled regions in a document that serve as containers for specific types of content. Individual content controls may contain contents such as images, tables, or paragraphs of formatted text. Currently, only rich text and plain text content controls are supported.","CritiqueAnnotation":"Represents an annotation wrapper around critique displayed in the document.","CustomProperty":"Represents a custom property.","CustomPropertyCollection":"Contains the collection of CustomProperty objects.","CustomXmlPart":"Represents a custom XML part.","CustomXmlPartCollection":"Contains the collection of CustomXmlPart objects.","CustomXmlPartScopedCollection":"Contains the collection of CustomXmlPart objects with a specific namespace.","Document":"The Document object is the top level object. A Document object contains one or more sections, content controls, and the body that contains the contents of the document.","DocumentCreated":"The DocumentCreated object is the top level object created by Application.CreateDocument. A DocumentCreated object is a special Document object.","DocumentProperties":"Represents document properties.","Field":"Represents a field.","FieldCollection":"Contains a collection of Field objects.","Font":"Represents a font.","InlinePicture":"Represents an inline picture.","InlinePictureCollection":"Contains a collection of InlinePicture objects.","List":"Contains a collection of Paragraph objects.","ListCollection":"Contains a collection of List objects.","ListItem":"Represents the paragraph list item format.","ListLevel":"Represents a list level.","ListLevelCollection":"Contains a collection of ListLevel objects.","ListTemplate":"Represents a ListTemplate.","NoteItem":"Represents a footnote or endnote.","NoteItemCollection":"Contains a collection of NoteItem objects.","Paragraph":"Represents a single paragraph in a selection, range, content control, or document body.","ParagraphCollection":"Contains a collection of Paragraph objects.","ParagraphFormat":"Represents a style of paragraph in a document.","Range":"Represents a contiguous area in a document.","RangeCollection":"Contains a collection of Range objects.","SearchOptions":"Specifies the options to be included in a search operation. To learn more about how to use search options in the Word JavaScript APIs, read Use search options to find text in your Word add-in.","Section":"Represents a section in a Word document.","SectionCollection":"Contains the collection of the document\'s Section objects.","Setting":"Represents a setting of the add -in.","SettingCollection":"Contains the collection of Setting objects.","Shading":"Represents the shading object.","Style":"Represents a style in a Word document.","StyleCollection":"Contains a collection of Style objects.","Table":"Represents a table in a Word document.","TableBorder":"Specifies the border style.","TableCell":"Represents a table cell in a Word document.","TableCellCollection":"Contains the collection of the document\'s TableCell objects.","TableCollection":"Contains the collection of the document\'s Table objects.","TableRow":"Represents a row in a Word document.","TableRowCollection":"Contains the collection of the document\'s TableRow objects.","TableStyle":"Represents the TableStyle object.","TrackedChange":"Represents a tracked change in a Word document.","TrackedChangeCollection":"Contains a collection of TrackedChange."}';
    const parsedObjectDescription = JSON.parse(objectJson);

    const generateProjectPrompt = `
        # Role
        I want you act as an expert in Office JavaScript add-in development area.You are also an advisor for Office add-in developers.

        # Instructions
        - Given the Office JavaScript add-in developer's request, please follow below to help determine the information about generating an JavaScript add-in project.
        - You should interpret the intention of developer's request as an ask to generate an Office JavaScript add-in project. And polish user input into some sentences if necessary.
        - You should go through the following steps silently, and only reply to user with a JSON result in each step. Do not explain why for your answer.

        - Suggest an platform for the add-in project.There are 3 options: Word, Excel, PowerPoint.If you can't determine, just say All.
        - You should base on your understanding of developer intent and the capabilities of Word, Excel, PowerPoint to make the suggestion.
        - Remember it as "PLATFORM".

        - Suggest an add-in type.You have 3 options: taskpane, content, custom function. You should notice Word doesn't have content type, and only Excel has custom function type. Remember it as "TYPE".

        - You should then base on the "PLATFORM" information and add-in developer asks to suggest one or a set of specific Office JavaScript API objects that are related.
        - You should analyze the API objects typical user cases or capabilities of their related UI features to suggest the most relevant ones.
        - The suggested API objects should not be too general such as "Document", "Workbook", "Presentation".
        - The suggested API objects should be from the list inside "API objects list".
        - The "API objects list" is a JSON object with a list of Office JavaScript API objects and their descriptions. The "API obejcts list" is as follows: ${JSON.stringify(parsedObjectDescription)}
        - You should give 3 most relevant objects. Remember it as "APISET".

        - Provide some detailed summary about why you make the suggestions in above steps. Remember it as "SUMMARY".
        ` ;

    const addinPlatfromTypeAPIResponse = await getResponseAsStringCopilotInteraction(generateProjectPrompt, request);
    if (addinPlatfromTypeAPIResponse) {
      const responseJson = parseCopilotResponseMaybeWithStrJson(addinPlatfromTypeAPIResponse);
      const apiObjectsStr = Array.isArray(responseJson.APISET) ? responseJson.APISET.map((api: string) => `${api}`).join(", ") : '';

      const generateCodePrompt = `
      # Role
      I want you act as an expert in Office JavaScript add-in development area.You are also an advisor for Office add-in developers.

      # Instructions
      - You should help generate a code snippet including Office JavaScript API calls based on user request.
      - The generated method must start with 'export async function' keyword.
      - The generated method should contain a meaningful function name and a runnable code snippet with its own context.
      - The generated method should have a try catch block to handle the exception.
      - Each generated method should contain Word.run, Excel.run or PowerPoint.run logic.
      - Each generated method should not have any passed in parameters. The necessary parameters should be defined inside the method.
      - The generated method for each object should contain loading properties, get and set properties and some method calls. All the properties, method calls should be existing on this object or related with it.
      - Remember to strictly reference the "API list" to generate the code. The "API list" is as follows: ${getApiListStringByObject(apiObjectsStr.split(', '))}.
      - If the userPrompt includes add or insert keywords, your generated code should contain insert or add method calls.
      `;

      let codeMath = "";

      const userRequestBackup = request.userPrompt;
      request.userPrompt = ` Please generate one method for each ${apiObjectsStr} ${responseJson.PLATFORM} JavaScript API object.`;
      host = `${responseJson.PLATFORM}`;
      while (codeMath === "") {
        const generatedCodeResponse = await getResponseAsStringCopilotInteraction(generateCodePrompt, request);
        if (generatedCodeResponse) {
          const quoteChar = '```';
          //const regex = new RegExp(`${quoteChar}(.*?)${quoteChar}`, 'g');
          const regex = /```javascript([\s\S]*?)```/g;
          const matches = [...generatedCodeResponse.matchAll(regex)];
          codeMath = matches.map((match) => match[1]).join('\n');

          console.log(codeMath);
        }
      }

      request.userPrompt = userRequestBackup;
      let codeMath2 = "";
      let generatedCodeResponse2: string | undefined = '';
      console.log(codeMath2);
      while (codeMath2 === "") {
        generatedCodeResponse2 = await getResponseAsStringCopilotInteraction(generateCodePrompt, request);
        if (generatedCodeResponse2) {
          const quoteChar = '```';
          //const regex = new RegExp(`${quoteChar}(.*?)${quoteChar}`, 'g');
          const regex = /```javascript([\s\S]*?)```/g;
          const matches = [...generatedCodeResponse2.matchAll(regex)];
          codeMath2 = matches.map((match) => match[1]).join('\n');
          console.log(codeMath2);
        }
      }
      codeMathToBeInserted = correctEnumSpelling(codeMath2);
      request.response.markdown(`${generatedCodeResponse2}`);
      request.response.markdown(`\n\nDo you want to try the code snippet in an Office add-in project?`);
    }
    const NextStepCreate: vscode.ChatFollowup = {
      prompt: "Create a new Office add-in including the above code snippet",
      command: "",
      label: vscode.l10n.t("Try the snippet in an Office add-in project"),
    };
    return { chatAgentResult: { slashCommand: "create" }, followUp: [NextStepCreate] };
  }
  else if (lastResponse.includes("```javascript") && (request.userPrompt.toLowerCase().includes("y") || request.userPrompt.includes("Create a new Office add-in including the above code snippet"))) {
    // const lastTimeResponse: vscode.ChatRequestTurn | vscode.ChatResponseTurn | undefined = request.context.history.find(item => item instanceof vscode.ChatResponseTurn);
    // let response;
    // if (lastTimeResponse instanceof vscode.ChatResponseTurn) {
    //   response = lastTimeResponse.response;
    // }


    if (lastResponse.includes('Excel')) {
      host = 'Excel';
    } else if (lastResponse.includes('Word')) {
      host = 'Word';
    } else if (lastResponse.includes('PowerPoint')) {
      host = 'PowerPoint';
    }
    const regex = /```javascript([\s\S]*?)```/g;
    const matches = [...lastResponse.matchAll(regex)];
    codeMathToBeInserted = matches.map((match) => match[1]).join('\n');
    codeMathToBeInserted = correctEnumSpelling(codeMathToBeInserted);


    request.response.markdown(`\n\n Here is the tree structure of the add-in project.`);
    const wxpSampleURLInfo: SampleUrlInfo = {
      owner: "GavinGu07",
      repository: "Office-Add-in-Templates",
      ref: "main",
      dir: host
    };
    const { samplePaths, fileUrlPrefix } = await getSampleFileInfo(wxpSampleURLInfo, 2);
    const tempFolder = tmp.dirSync({ unsafeCleanup: true }).name;
    const nodes = await buildFileTree(fileUrlPrefix, samplePaths, tempFolder, wxpSampleURLInfo.dir, 2, 20);
    request.response.filetree(nodes, vscode.Uri.file(path.join(tempFolder, wxpSampleURLInfo.dir)));

    const folder = path.join(tempFolder, wxpSampleURLInfo.dir);

    fs.writeFile(tmpTxtPath, folder, (err) => {
      if (err) {
        console.log('Error writing file:', err);
      } else {
        console.log('File written successfully');
      }
    });
    await modifyFile(folder, codeMathToBeInserted);
    request.response.markdown(`Do you want to create your add-in project at the default location ${defaultTargetFolder}?\n`);
    const NextStepCreateDone: vscode.ChatFollowup = {
      prompt: "Create the project above.",
      command: "",
      label: vscode.l10n.t("Create the project above."),
    };
    return { chatAgentResult: { slashCommand: "create" }, followUp: [NextStepCreateDone] };
  } else if ((request.userPrompt.toLowerCase().includes("y") || request.userPrompt.includes("Create the project above")) && lastResponse.includes("Do you want to create your add-in project at the default location")) {
    const tmpFolder = await readTextFile(tmpTxtPath);
    await fs.copy(tmpFolder, defaultTargetFolder);
    fs.unlink(tmpTxtPath, (err) => {
      if (err) {
        console.log('Error deleting file:', err);
      } else {
        console.log('File deleted successfully');
      }
    });
    request.response.markdown(`The add-in project has been created successfully. Next, you should run the following command in the terminal.\n`);
    request.response.markdown(`\`\`\`bash\nnpm install\n\`\`\`\n`);
    request.response.markdown(`After the installation is completed, you can press \`F5\` to launch the add-in.\n`);
    const NextStepFix: vscode.ChatFollowup = {
      prompt: "Fix the errors in my code",
      command: "fix",
      label: vscode.l10n.t("Fix the errors in my code"),
    };
    const NextStepGenerate: vscode.ChatFollowup = {
      prompt: "Generate more code",
      command: "",
      label: vscode.l10n.t("Generate more code"),
    };
    return { chatAgentResult: { slashCommand: 'create' }, followUp: [NextStepFix, NextStepGenerate] };
  }
  const defaultSystemPrompt = `You are an expert in Teams Toolkit Extension for VS Code. The user wants to use Teams Toolkit Extension for VS Code. They want to use them to solve a problem or accomplish a task. Your job is to help the user learn about how they can use Teams Toolkit Extension for VS Code to solve a problem or accomplish a task. Do not suggest using any other tools other than what has been previously mentioned. Assume the the user is only interested in using Teams Toolkit Extension to develop teams app. Finally, do not overwhelm the user with too much information. Keep responses short and sweet.`;

  const { copilotResponded } = await verbatimCopilotInteraction(
    defaultSystemPrompt,
    request
  );
  if (!copilotResponded) {
    request.response.report({
      content: vscode.l10n.t("Sorry, I can't help with that right now.\n"),
    });
    return { chatAgentResult: { slashCommand: "" }, followUp: [] };
  } else {
    return { chatAgentResult: { slashCommand: "" }, followUp: [] };
  }
}

function registerVSCodeCommands(participant: vscode.ChatParticipant, participant2: vscode.ChatParticipant) {
  ext.context.subscriptions.push(
    participant,
    participant2,
    vscode.commands.registerCommand(CREATE_SAMPLE_COMMAND_ID, createCommand),
    vscode.commands.registerCommand(EXECUTE_COMMAND_ID, executeCommand)
  );
}

function correctEnumSpelling(enumString: string): string {

  const regex = /Excel.ChartType.([\s\S]*?),/g;
  const matches = [...enumString.matchAll(regex)];
  const codeMath = matches.map((match) => match[1]).join('\n');
  const lowerCaseStarted = codeMath.charAt(0).toLowerCase() + codeMath.slice(1);

  return enumString.split(codeMath).join(lowerCaseStarted);
}

async function fileExists(uri: vscode.Uri): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(uri);
    return true;
  } catch {
    return false;
  }
}

function getLastResponse(request: AgentRequest): string {
  const historyArray = request.context.history;
  for (var i = historyArray.length - 1; i >= 0; i--) {
    if (historyArray[i] instanceof vscode.ChatResponseTurn) {
      const history = historyArray[i] as vscode.ChatResponseTurn;
      const responseArray = history.response;
      for (var j = responseArray.length - 1; j >= 0; j--) {
        if (responseArray[j] instanceof vscode.ChatResponseMarkdownPart) {
          return (responseArray[j] as vscode.ChatResponseMarkdownPart).value.value;
        }
      }
    }
  }
  return "";
}

async function readTextFile(filePath: string): Promise<string> {
  try {
    const data = await fs.promises.readFile(filePath, 'utf8');
    return data;
  } catch (err) {
    console.error('Error reading file:', err);
    return '';
  }
}

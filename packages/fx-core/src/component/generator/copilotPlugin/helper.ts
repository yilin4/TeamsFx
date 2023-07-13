// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * @author yuqzho@microsoft.com
 */

import {
  Context,
  OpenAIManifestAuthType,
  OpenAIPluginManifest,
  Result,
  err,
  ok,
} from "@microsoft/teamsfx-api";
import axios, { AxiosResponse } from "axios";
import { sendRequestWithRetry } from "../utils";
import {
  ErrorType as ApiSpecErrorType,
  ValidationStatus,
} from "../../../common/spec-parser/interfaces";
import { SpecParser } from "../../../common/spec-parser/specParser";

const manifestFilePath = "/.well-known/ai-plugin.json";

enum OpenAIPluginManifestErrorType {
  AuthNotSupported,
  ApiUrlMissing,
}

export interface ErrorResult {
  /**
   * The type of error.
   */
  type: ApiSpecErrorType | OpenAIPluginManifestErrorType;

  /**
   * The content of the error.
   */
  content: string;

  /**
   * The api path of the error.
   */
  apiPath?: string;
}

export class OpenAIManifestHelper {
  static async loadOpenAIPluginManifest(domain: string): Promise<OpenAIPluginManifest> {
    const path = domain + manifestFilePath;
    const res: AxiosResponse<any> = await sendRequestWithRetry(async () => {
      return await axios.get(path);
    }, 3);
    return res.data;
  }

  static async updateManifest(manifest: OpenAIPluginManifest, manifestPath: string): Promise<void> {
    //TODO: implementation
  }
}

export async function listOperations(
  context: Context,
  manifest: OpenAIPluginManifest | undefined,
  apiSpecUrl: string | undefined,
  shouldLogWarning = true
): Promise<Result<string[], ErrorResult[]>> {
  if (manifest) {
    apiSpecUrl = manifest.api.url;
    const errors = validateOpenAIPluginManifest(manifest);
    if (errors.length > 0) {
      return err(errors);
    }
  }

  const specParser = new SpecParser(apiSpecUrl!);
  const validationRes = await specParser.validate();

  if (validationRes.status === ValidationStatus.Error) {
    return err(validationRes.errors);
  }

  if (shouldLogWarning && validationRes.warnings.length > 0) {
    for (const warning of validationRes.warnings) {
      context.logProvider.warning(warning.content);
    }
  }

  const operations = await specParser.list();
  return ok(operations);
}

function validateOpenAIPluginManifest(manifest: OpenAIPluginManifest): ErrorResult[] {
  const errors: ErrorResult[] = [];
  if (!manifest.api.url) {
    errors.push({
      type: OpenAIPluginManifestErrorType.ApiUrlMissing,
      content: "Missing url in manifest",
    });
  }

  if (manifest.auth.type !== OpenAIManifestAuthType.None) {
    errors.push({
      type: OpenAIPluginManifestErrorType.AuthNotSupported,
      content: "Auth type not supported",
    });
  }
  return errors;
}
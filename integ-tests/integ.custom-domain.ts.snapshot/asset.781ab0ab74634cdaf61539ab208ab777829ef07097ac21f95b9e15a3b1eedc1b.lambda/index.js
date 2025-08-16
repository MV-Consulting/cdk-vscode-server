"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/secret-retriever/secret-retriever.lambda.ts
var secret_retriever_lambda_exports = {};
__export(secret_retriever_lambda_exports, {
  handler: () => handler
});
module.exports = __toCommonJS(secret_retriever_lambda_exports);
var import_client_secrets_manager = require("@aws-sdk/client-secrets-manager");
var secretsManager = new import_client_secrets_manager.SecretsManager();
var handler = async (event) => {
  console.log("Event: %j", { ...event, ResponseURL: "..." });
  if (event.RequestType === "Delete") {
    return {};
  }
  const secretArn = event.ResourceProperties.SecretArn;
  console.log("secretArn: %j", secretArn);
  try {
    const secret = await secretsManager.getSecretValue({
      SecretId: secretArn
    });
    const secretValue = secret.SecretString;
    console.log("secretValue: %j", secretValue);
    const parsedSecretValue = JSON.parse(secretValue);
    console.log("secretValue is JSON: %j", parsedSecretValue);
    return {
      Data: {
        secretValue: parsedSecretValue,
        secretPasswordValue: parsedSecretValue.password
      }
    };
  } catch (error) {
    console.error(error);
    throw error;
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  handler
});

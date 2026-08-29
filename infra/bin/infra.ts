#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import { VideoGenerationStack } from "../lib/video-generation-stack";

const app = new cdk.App();

const namePrefix = app.node.tryGetContext("namePrefix") ?? "video-gen-dev";
const sesSenderEmail =
  app.node.tryGetContext("sesSenderEmail") ??
  process.env.SES_SENDER_EMAIL ??
  "no-reply@example.com";

new VideoGenerationStack(app, `${namePrefix}-stack`, {
  namePrefix,
  sesSenderEmail,
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});

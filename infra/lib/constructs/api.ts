import * as path from "node:path";
import { Duration } from "aws-cdk-lib";
import * as apigwv2 from "aws-cdk-lib/aws-apigatewayv2";
import {
  HttpJwtAuthorizer,
} from "aws-cdk-lib/aws-apigatewayv2-authorizers";
import { HttpLambdaIntegration } from "aws-cdk-lib/aws-apigatewayv2-integrations";
import * as cognito from "aws-cdk-lib/aws-cognito";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as lambdaNodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as sqs from "aws-cdk-lib/aws-sqs";
import { EnvVar } from "@video-generation/shared";
import { Construct } from "constructs";

export interface ApiConstructProps {
  namePrefix: string;
  userPool: cognito.UserPool;
  userPoolClient: cognito.UserPoolClient;
  table: dynamodb.Table;
  queue: sqs.Queue;
}

const API_SRC = path.join(__dirname, "..", "..", "..", "apps", "api", "src");

/**
 * API Gateway (HTTP API) + Cognito JWT オーソライザー + Lambda。
 * ユーザーからの動画生成リクエスト受付とステータス参照を提供する。
 */
export class ApiConstruct extends Construct {
  public readonly httpApi: apigwv2.HttpApi;

  constructor(scope: Construct, id: string, props: ApiConstructProps) {
    super(scope, id);

    const commonEnv = {
      [EnvVar.TABLE_NAME]: props.table.tableName,
      [EnvVar.QUEUE_URL]: props.queue.queueUrl,
    };

    const commonProps: Partial<lambdaNodejs.NodejsFunctionProps> = {
      runtime: lambda.Runtime.NODEJS_20_X,
      memorySize: 256,
      timeout: Duration.seconds(10),
      bundling: {
        externalModules: ["@aws-sdk/*"],
      },
    };

    const createVideoFn = new lambdaNodejs.NodejsFunction(
      this,
      "CreateVideoFn",
      {
        ...commonProps,
        functionName: `${props.namePrefix}-create-video`,
        entry: path.join(API_SRC, "handlers", "createVideo.ts"),
        environment: commonEnv,
      },
    );

    const getVideoFn = new lambdaNodejs.NodejsFunction(this, "GetVideoFn", {
      ...commonProps,
      functionName: `${props.namePrefix}-get-video`,
      entry: path.join(API_SRC, "handlers", "getVideo.ts"),
      environment: commonEnv,
    });

    const listVideosFn = new lambdaNodejs.NodejsFunction(
      this,
      "ListVideosFn",
      {
        ...commonProps,
        functionName: `${props.namePrefix}-list-videos`,
        entry: path.join(API_SRC, "handlers", "listVideos.ts"),
        environment: commonEnv,
      },
    );

    props.table.grantReadWriteData(createVideoFn);
    props.queue.grantSendMessages(createVideoFn);
    props.table.grantReadData(getVideoFn);
    props.table.grantReadData(listVideosFn);

    const authorizer = new HttpJwtAuthorizer(
      "CognitoAuthorizer",
      `https://cognito-idp.${process.env.CDK_DEFAULT_REGION ?? "ap-northeast-1"}.amazonaws.com/${props.userPool.userPoolId}`,
      {
        jwtAudience: [props.userPoolClient.userPoolClientId],
      },
    );

    this.httpApi = new apigwv2.HttpApi(this, "HttpApi", {
      apiName: `${props.namePrefix}-video-api`,
      corsPreflight: {
        allowHeaders: ["Authorization", "Content-Type"],
        allowMethods: [
          apigwv2.CorsHttpMethod.GET,
          apigwv2.CorsHttpMethod.POST,
          apigwv2.CorsHttpMethod.OPTIONS,
        ],
        allowOrigins: ["*"],
      },
    });

    this.httpApi.addRoutes({
      path: "/videos",
      methods: [apigwv2.HttpMethod.POST],
      integration: new HttpLambdaIntegration(
        "CreateVideoIntegration",
        createVideoFn,
      ),
      authorizer,
    });

    this.httpApi.addRoutes({
      path: "/videos/{videoId}",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "GetVideoIntegration",
        getVideoFn,
      ),
      authorizer,
    });

    this.httpApi.addRoutes({
      path: "/videos",
      methods: [apigwv2.HttpMethod.GET],
      integration: new HttpLambdaIntegration(
        "ListVideosIntegration",
        listVideosFn,
      ),
      authorizer,
    });
  }
}

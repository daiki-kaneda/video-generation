import * as path from "node:path";
import { RemovalPolicy, Stack } from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";

export interface FrontendConstructProps {
  namePrefix: string;
  /** フロントエンドから呼び出す API のベースURL */
  apiUrl: string;
  userPoolId: string;
  userPoolClientId: string;
}

const REPO_ROOT = path.join(__dirname, "..", "..", "..");
const WEB_DIST_DIR = path.join(REPO_ROOT, "apps", "web", "dist");

/**
 * React SPA (Vite ビルド) を S3 + CloudFront で配信する。
 * S3バケットはブロックパブリックアクセスとし、CloudFrontからは
 * Origin Access Control (OAC) 経由でのみアクセスを許可する。
 */
export class FrontendConstruct extends Construct {
  public readonly distribution: cloudfront.Distribution;
  public readonly bucket: s3.Bucket;

  constructor(scope: Construct, id: string, props: FrontendConstructProps) {
    super(scope, id);

    this.bucket = new s3.Bucket(this, "SiteBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    // S3オリジン(OAC)は単一のインスタンスを全ビヘイビアで共有する
    const s3Origin = origins.S3BucketOrigin.withOriginAccessControl(
      this.bucket,
    );

    // index.html / config.json はデプロイの度に内容が変わりうるためキャッシュさせない
    const noCacheBehaviorOptions: cloudfront.BehaviorOptions = {
      origin: s3Origin,
      cachePolicy: cloudfront.CachePolicy.CACHING_DISABLED,
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
    };

    this.distribution = new cloudfront.Distribution(this, "Distribution", {
      comment: `${props.namePrefix} frontend`,
      defaultRootObject: "index.html",
      defaultBehavior: {
        origin: s3Origin,
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      additionalBehaviors: {
        "index.html": noCacheBehaviorOptions,
        "config.json": noCacheBehaviorOptions,
      },
      // SPA(React Router)のクライアントサイドルーティングに対応するため、
      // S3が返す403/404を index.html (200) にフォールバックさせる
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: "/index.html",
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_200,
    });

    new s3deploy.BucketDeployment(this, "DeploySite", {
      destinationBucket: this.bucket,
      distribution: this.distribution,
      distributionPaths: ["/*"],
      prune: true,
      sources: [
        s3deploy.Source.asset(WEB_DIST_DIR),
        s3deploy.Source.jsonData("config.json", {
          apiUrl: props.apiUrl,
          userPoolId: props.userPoolId,
          userPoolClientId: props.userPoolClientId,
          region: Stack.of(this).region,
        }),
      ],
    });
  }
}

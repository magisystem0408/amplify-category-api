import { CfnResource, IAsset } from 'aws-cdk-lib';
import { Construct, IConstruct } from 'constructs';
import { Grant, IGrantable, IRole } from 'aws-cdk-lib/aws-iam';
import { TransformHostProvider } from './transform-host-provider';

// Auth Config Modes
export type AppSyncAuthMode = 'API_KEY' | 'AMAZON_COGNITO_USER_POOLS' | 'AWS_IAM' | 'OPENID_CONNECT' | 'AWS_LAMBDA';
export type AppSyncAuthConfiguration = {
  defaultAuthentication: AppSyncAuthConfigurationEntry;
  additionalAuthenticationProviders: Array<AppSyncAuthConfigurationEntry>;
};

export type AppSyncAuthConfigurationEntry =
  | AppSyncAuthConfigurationUserPoolEntry
  | AppSyncAuthConfigurationAPIKeyEntry
  | AppSyncAuthConfigurationIAMEntry
  | AppSyncAuthConfigurationOIDCEntry
  | AppSyncAuthConfigurationLambdaEntry;

export type AppSyncAuthConfigurationAPIKeyEntry = {
  authenticationType: 'API_KEY';
  apiKeyConfig?: ApiKeyConfig;
};
export type AppSyncAuthConfigurationUserPoolEntry = {
  authenticationType: 'AMAZON_COGNITO_USER_POOLS';
  userPoolConfig?: UserPoolConfig;
};
export type AppSyncAuthConfigurationIAMEntry = {
  authenticationType: 'AWS_IAM';
};

export type AppSyncAuthConfigurationOIDCEntry = {
  authenticationType: 'OPENID_CONNECT';
  openIDConnectConfig?: OpenIDConnectConfig;
};

export type AppSyncAuthConfigurationLambdaEntry = {
  authenticationType: 'AWS_LAMBDA';
  lambdaAuthorizerConfig?: LambdaConfig;
};

export interface ApiKeyConfig {
  description?: string;
  apiKeyExpirationDays: number;
  apiKeyExpirationDate?: Date;
}
export interface UserPoolConfig {
  userPoolId: string;
}
export interface OpenIDConnectConfig {
  name: string;
  issuerUrl: string;
  clientId?: string;
  iatTTL?: number;
  authTTL?: number;
}

export interface LambdaConfig {
  lambdaFunction: string;
  ttlSeconds?: number;
}

/**
 * VpcConfig required to deploy a Lambda function in a VPC. The SQL Lambda will be deployed into the specified VPC, subnets, and security
 * groups. The specified subnets and security groups must be in the same VPC. The VPC must have at least one subnet. The construct will also
 * create VPC endpoints in the specified subnets, as well as inbound security rules to allow traffic on port 443 within each security group,
 * to allow the Lambda to read database connection information from Secure Systems Manager. */
export type VpcConfig = {
  vpcId: string;
  subnetAvailabilityZoneConfig: SubnetAvailabilityZone[];
  securityGroupIds: string[];
};

/**
 * Although it is possible to create multiple subnets in a single availability zone, VPC Endpoints may only be deployed to a single subnet
 * in a given availability zone. We use this structure to ensure that the Lambda function and VPC endpoints are mutually consistent.
 */
export type SubnetAvailabilityZone = {
  SubnetId: string;
  AvailabilityZone: string;
};

/**
 * Maps a given AWS region to the SQL Lambda layer version ARN for that region.
 */
export type RDSLayerMapping = {
  [key: string]: {
    layerRegion: string;
  };
};

export interface AppSyncFunctionConfigurationProvider extends IConstruct {
  readonly arn: string;
  readonly functionId: string;
}
export interface DataSourceOptions {
  /**
   * The name of the data source, overrides the id given by cdk
   *
   * @default - generated by cdk given the id
   */
  readonly name?: string;
  /**
   * The description of the data source
   *
   * @default - No description
   */
  readonly description?: string;
}

export interface SearchableDataSourceOptions extends DataSourceOptions {
  /**
   * ServiceRole for the Amazon OpenSearch
   */
  readonly serviceRole: IRole;
}

export enum TemplateType {
  INLINE = 'INLINE',
  S3_LOCATION = 'S3_LOCATION',
}
export interface InlineMappingTemplateProvider {
  type: TemplateType.INLINE;
  bind: (scope: Construct) => string;
  getTemplateHash: () => string;
}

export interface S3MappingTemplateProvider {
  type: TemplateType.S3_LOCATION;
  bind: (scope: Construct) => string;
  getTemplateHash: () => string;
}

export interface S3MappingFunctionCodeProvider {
  type: TemplateType.S3_LOCATION;
  bind: (scope: Construct) => IAsset;
}

export type MappingTemplateProvider = InlineMappingTemplateProvider | S3MappingTemplateProvider;

export interface GraphQLAPIProvider extends IConstruct {
  readonly apiId: string;
  readonly host: TransformHostProvider;
  readonly name: string;

  // getDefaultAuthorization(): Readonly<AuthorizationMode>;
  // getAdditionalAuthorizationModes(): Readonly<AuthorizationMode[]>;
  addToSchema: (addition: string) => void;
  addSchemaDependency: (construct: CfnResource) => boolean;

  grant: (grantee: IGrantable, resources: APIIAMResourceProvider, ...actions: string[]) => Grant;
  // /**
  //  *  Adds an IAM policy statement for Mutation access to this GraphQLApi to an IAM principal's policy.
  //  *
  //  * @param grantee The principal.
  //  * @param fields The fields to grant access to that are Mutations (leave blank for all).
  //  */
  grantMutation: (grantee: IGrantable, ...fields: string[]) => Grant;
  // /**
  //  *  Adds an IAM policy statement for Query access to this GraphQLApi to an IAM principal's policy.
  //  *
  //  * @param grantee The principal.
  //  * @param fields The fields to grant access to that are Queries (leave blank for all).
  //  */
  grantQuery: (grantee: IGrantable, ...fields: string[]) => Grant;
  // /**
  //  *  Adds an IAM policy statement for Subscription access to this GraphQLApi to an IAM principal's policy.
  //  *
  //  * @param grantee The principal.
  //  * @param fields The fields to grant access to that are Subscriptions (leave blank for all).
  //  */
  grantSubscription: (grantee: IGrantable, ...fields: string[]) => Grant;
}

export interface APIIAMResourceProvider {
  /**
   * Return the Resource ARN
   *
   * @param api The GraphQL API to give permissions
   */
  resourceArns: (api: GraphQLAPIProvider) => string[];
}

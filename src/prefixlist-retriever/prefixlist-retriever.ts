import { RemovalPolicy } from 'aws-cdk-lib';
import { IPrefixList, PrefixList } from 'aws-cdk-lib/aws-ec2';
import { Effect, PolicyStatement, Role, ServicePrincipal } from 'aws-cdk-lib/aws-iam';
import { LogGroup } from 'aws-cdk-lib/aws-logs';
import { AwsCustomResource, AwsCustomResourcePolicy, PhysicalResourceId } from 'aws-cdk-lib/custom-resources';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

export interface AwsManagedPrefixListProps {
  /**
   * Name of the aws managed prefix list.
   * See: https://docs.aws.amazon.com/vpc/latest/userguide/working-with-aws-managed-prefix-lists.html#available-aws-managed-prefix-lists
   * eg. com.amazonaws.global.cloudfront.origin-facing
   *
   * see all via aws ec2 describe-managed-prefix-lists  --region <REGION> | jq -r '.PrefixLists[] | select (.PrefixListName == "com.amazonaws.global.cloudfront.origin-facing") | .PrefixListId'
   */
  readonly name: string;
}

// copied with grace from here until cdk supports it
// https://github.com/aws/aws-cdk/issues/15115#issuecomment-1665104687
export class AwsManagedPrefixList extends Construct {
  public readonly prefixList: IPrefixList;

  constructor(scope: Construct, id: string, { name }: AwsManagedPrefixListProps) {
    super(scope, id);

    const cr = new AwsCustomResource(this, 'GetPrefixListId', {
      logGroup: new LogGroup(this, 'GetPrefixListIdLogGroup', {
        removalPolicy: RemovalPolicy.DESTROY,
        retention: 1,
      }),
      onUpdate: {
        service: '@aws-sdk/client-ec2',
        action: 'DescribeManagedPrefixListsCommand',
        parameters: {
          Filters: [
            {
              Name: 'prefix-list-name',
              Values: [name],
            },
          ],
        },
        physicalResourceId: PhysicalResourceId.of(`${id}-${this.node.addr.slice(0, 16)}`),
      },
      policy: AwsCustomResourcePolicy.fromStatements([
        new PolicyStatement({
          effect: Effect.ALLOW,
          actions: ['ec2:DescribeManagedPrefixLists'],
          resources: ['*'],
        }),
      ]),
      role: new Role(this, 'GetPrefixListIdRole', {
        assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
      }),
      removalPolicy: RemovalPolicy.DESTROY,
    });
    NagSuppressions.addResourceSuppressions([
      cr,
    ], [
      { id: 'AwsSolutions-IAM5', reason: 'For this provider wildcards are fine' },
    ], true);

    const prefixListId = cr.getResponseField('PrefixLists.0.PrefixListId');

    this.prefixList = PrefixList.fromPrefixListId(this, 'PrefixList', prefixListId);
  }
}
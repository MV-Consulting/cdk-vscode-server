import { RemovalPolicy } from 'aws-cdk-lib';
import { AttributeType, BillingMode, Table, TableEncryption } from 'aws-cdk-lib/aws-dynamodb';
import { NagSuppressions } from 'cdk-nag';
import { Construct } from 'constructs';

/**
 * Props for InstanceStateTable construct
 */
export interface InstanceStateTableProps {
  /**
   * Table name
   * @default - auto-generated
   */
  readonly tableName?: string;
}

/**
 * DynamoDB table for tracking instance state and activity
 */
export class InstanceStateTable extends Construct {
  /**
   * The DynamoDB table
   */
  public readonly table: Table;

  constructor(scope: Construct, id: string, props?: InstanceStateTableProps) {
    super(scope, id);

    this.table = new Table(this, 'Table', {
      tableName: props?.tableName,
      partitionKey: {
        name: 'instanceId',
        type: AttributeType.STRING,
      },
      billingMode: BillingMode.PAY_PER_REQUEST,
      encryption: TableEncryption.AWS_MANAGED,
      pointInTimeRecovery: false, // Workshop use - can be enabled for production
      removalPolicy: RemovalPolicy.DESTROY, // Workshop use
    });

    NagSuppressions.addResourceSuppressions(
      this.table,
      [
        {
          id: 'AwsSolutions-DDB3',
          reason: 'Point-in-time recovery not needed for workshop/dev environments',
        },
      ],
      true,
    );
  }
}

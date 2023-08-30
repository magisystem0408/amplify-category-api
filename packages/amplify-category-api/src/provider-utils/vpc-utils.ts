import { SubnetAvailabilityZone } from '@aws-amplify/graphql-transformer-interfaces';
import { EC2Client, DescribeSubnetsCommand } from '@aws-sdk/client-ec2';

export const getAvaliabilityZoneOfSubnets = async (subnetIds: string[], region: string): Promise<SubnetAvailabilityZone[]> => {
  const ec2 = new EC2Client({ region });
  const command = new DescribeSubnetsCommand({
    SubnetIds: subnetIds,
  });
  const subnets = await ec2.send(command);
  return subnets.Subnets?.map((subnet) => ({
    SubnetId: subnet.SubnetId,
    AvailabilityZone: subnet.AvailabilityZone,
  }));
};

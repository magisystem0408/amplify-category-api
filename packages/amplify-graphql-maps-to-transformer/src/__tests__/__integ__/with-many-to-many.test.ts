/* eslint-disable import/no-extraneous-dependencies */
import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { DeploymentResources, GraphQLTransform } from '@aws-amplify/graphql-transformer-core';
import { HasOneTransformer, ManyToManyTransformer } from '@aws-amplify/graphql-relational-transformer';
import { IndexTransformer } from '@aws-amplify/graphql-index-transformer';
import { AuthTransformer } from '@aws-amplify/graphql-auth-transformer';
import { ObjectTypeDefinitionNode, parse } from 'graphql';
import { FeatureFlagProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { MapsToTransformer } from '../../graphql-maps-to-transformer';
import { expectedResolversForModelWithRenamedField } from './common';


const featureFlags: FeatureFlagProvider = {
  getBoolean: (_: string): boolean => false,
  getNumber: jest.fn(),
  getObject: jest.fn(),
};

const manyToManyMapped = /* GraphQL */ `
  type Employee @model @mapsTo(name: "Person") {
    id: ID!
    tasks: [Task] @manyToMany(relationName: "EmployeeTask")
  }

  type Task @model @mapsTo(name: "Todo") {
    id: ID!
    title: String
    employees: [Employee] @manyToMany(relationName: "EmployeeTask")
  }
`;

const transformSchema = (schema: string): DeploymentResources => {
  const indexTransformer = new IndexTransformer();
  const modelTransformer = new ModelTransformer();
  const hasOneTransformer = new HasOneTransformer();
  const authTransformer = new AuthTransformer();
  const transformer = new GraphQLTransform({
    featureFlags,
    transformers: [
      modelTransformer,
      indexTransformer,
      hasOneTransformer,
      authTransformer,
      new ManyToManyTransformer(modelTransformer, indexTransformer, hasOneTransformer, authTransformer),
      new MapsToTransformer(),
    ],
    sandboxModeEnabled: true,
  });
  return transformer.transform(schema);
};

describe('mapsTo with manyToMany', () => {
  it('creates resources with original GSIs and field names', () => {
    const out = transformSchema(manyToManyMapped);
    expect(out.stacks.EmployeeTask!.Resources!.EmployeeTaskTable09DF6270.Properties.GlobalSecondaryIndexes).toMatchSnapshot();
    const outSchema = parse(out.schema);
    const EmployeeTaskFields = (
      outSchema.definitions.find((def) => (def as any)?.name.value === 'EmployeeTask')! as ObjectTypeDefinitionNode
    ).fields!.map((field) => field.name.value);
    expect(EmployeeTaskFields).toEqual(
      expect.arrayContaining(['id', 'employeeID', 'taskID', 'task', 'employee', 'createdAt', 'updatedAt']),
    );
    const expectedResolvers = expectedResolversForModelWithRenamedField('EmployeeTask');
    expectedResolvers.forEach((resolver) => expect(out.resolvers[resolver]).toMatchSnapshot());
  });
});

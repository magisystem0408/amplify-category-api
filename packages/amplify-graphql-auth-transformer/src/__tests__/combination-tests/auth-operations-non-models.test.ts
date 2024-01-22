/*
 * The purpose of these tests is to give early warning of unexpected changes in resolver generation. These don't actually do much in the way
 * of testing functionality, but rather act as smoke tests to make sure we are alerted as early as possible to changes in the generated
 * resolver code and stack resources.
 *
 * NOTE: These tests use fake timers to fix the system time returned by `Date.now` and other calls. Any routines that rely on time to
 * actually pass will fail. As of this writing, this works as expected, but be aware of the behavior.
 */

import { ModelTransformer } from '@aws-amplify/graphql-model-transformer';
import { TransformerPluginProvider } from '@aws-amplify/graphql-transformer-interfaces';
import { PrimaryKeyTransformer } from '@aws-amplify/graphql-index-transformer';
import { AuthTransformer } from '../../graphql-auth-transformer';
import {
  TestTable,
  convertToTestArgumentArray,
  ddbDataSourceStrategies,
  makeTransformationExpectation,
  sqlDataSourceStrategies,
  testRules,
} from './snapshot-utils';

const ddbSchemaTemplate = /* GraphQL */ `
  type Foo {
    description: String! @auth(rules: [ <FIELD_AUTH_RULE> ])
  }
  type Bar @model {
    id: ID!
    foo: Foo
  }
`;

const sqlSchemaTemplate = /* GraphQL */ `
  type Foo {
    description: String! @auth(rules: [ <FIELD_AUTH_RULE> ])
  }
  type Bar @model {
    id: ID! @primaryKey
    foo: Foo
  }
`;

const operations = ['create', 'update', 'delete', 'read', 'get', 'list', 'sync', 'listen', 'search'];

describe('Auth operation combinations: non-model', () => {
  beforeEach(() => {
    // Fix all Date.now() calls to 1704067200000 epoch milliseconds
    const fakeDate = Date.UTC(2024, 0, 1, 0, 0, 0);
    jest.useFakeTimers('modern');
    jest.setSystemTime(fakeDate);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('DDB data sources', () => {
    const makeTransformers: () => TransformerPluginProvider[] = () => [new ModelTransformer(), new AuthTransformer()];
    const expectation = makeTransformationExpectation(ddbDataSourceStrategies, ddbSchemaTemplate, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(ddbDataSourceStrategies)) {
      for (const fieldRuleName of Object.keys(testRules)) {
        for (const operation of operations) {
          const expectedErrorMessage = ['get', 'list', 'sync', 'listen', 'search'].includes(operation)
            ? `'${operation}' operation is not allowed at the field level.`
            : "@auth rules on fields within types that does not have @model directive cannot specify 'operations' argument as there are operations will be generated by the CLI.";
          testTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName,
              fieldRuleExt: `, operations: [${operation}]`,
              modelRuleName: undefined,
              modelRuleExt: undefined,
              expectedErrorMessage,
            }),
          );
        }
      }
    }

    test.each(testTable)('%s - %s%s - %s%s should fail', expectation);
  });

  describe('SQL data sources', () => {
    const makeTransformers: () => TransformerPluginProvider[] = () => [
      new ModelTransformer(),
      new AuthTransformer(),
      new PrimaryKeyTransformer(),
    ];

    const expectation = makeTransformationExpectation(sqlDataSourceStrategies, sqlSchemaTemplate, makeTransformers);

    const testTable: TestTable = [];
    for (const strategyName of Object.keys(sqlDataSourceStrategies)) {
      for (const fieldRuleName of Object.keys(testRules)) {
        for (const operation of operations) {
          const expectedErrorMessage = ['get', 'list', 'sync', 'listen', 'search'].includes(operation)
            ? `'${operation}' operation is not allowed at the field level.`
            : "@auth rules on fields within types that does not have @model directive cannot specify 'operations' argument as there are operations will be generated by the CLI.";
          testTable.push(
            convertToTestArgumentArray({
              strategyName,
              fieldRuleName,
              fieldRuleExt: `, operations: [${operation}]`,
              modelRuleName: undefined,
              modelRuleExt: undefined,
              expectedErrorMessage,
            }),
          );
        }
      }
    }

    test.each(testTable)('%s - %s%s - %s%s should fail', expectation);
  });
});

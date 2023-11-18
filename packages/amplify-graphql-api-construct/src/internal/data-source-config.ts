import {
  DataSourceType,
  DynamoDBProvisionStrategy,
  SQLDBType,
  SQLLambdaModelProvisionStrategy,
} from '@aws-amplify/graphql-transformer-interfaces';
import { ModelDataSourceStrategy } from '../types';

type DataSourceConfig = {
  modelToDatasourceMap: Map<string, DataSourceType>;
};

// TODO: Do away with this after we normalize database types throughout the internals
const convertSQLDBType = (definitionDBType: 'MYSQL' | 'POSTGRES'): SQLDBType => (definitionDBType === 'MYSQL' ? 'MySQL' : 'Postgres');

const convertToDataSourceType = (dataSourceStrategy: ModelDataSourceStrategy): DataSourceType => {
  if (dataSourceStrategy.dbType === 'DYNAMODB') {
    switch (dataSourceStrategy.provisionStrategy) {
      case 'DEFAULT':
        return {
          dbType: 'DDB',
          provisionDB: true,
          provisionStrategy: DynamoDBProvisionStrategy.DEFAULT,
        };
      case 'AMPLIFY_TABLE':
        return {
          dbType: 'DDB',
          provisionDB: true,
          provisionStrategy: DynamoDBProvisionStrategy.AMPLIFY_TABLE,
        };
      default:
        throw new Error(`Encountered unexpected provision strategy: ${(dataSourceStrategy as any).provisionStrategy}`);
    }
  } else if (dataSourceStrategy.dbType === 'MYSQL' || dataSourceStrategy.dbType === 'POSTGRES') {
    return {
      dbType: convertSQLDBType(dataSourceStrategy.dbType),
      provisionDB: false,
      provisionStrategy: SQLLambdaModelProvisionStrategy.DEFAULT,
    };
  }
  throw new Error(`Encountered unexpected database type ${dataSourceStrategy.dbType}`);
};

/**
 * An internal helper to convert from a map of model-to-ModelDataSourceStrategies to the map of model-to-DataSourceTypes that internal
 * transform processing requires. TODO: We can remove this once we refactor the internals to use ModelDataSourceStrategies natively.
 */
export const parseDataSourceConfig = (dataSourceDefinitionMap: Record<string, ModelDataSourceStrategy>): DataSourceConfig => {
  const modelToDatasourceMap = new Map<string, DataSourceType>();
  for (const [key, value] of Object.entries(dataSourceDefinitionMap)) {
    const dataSourceType = convertToDataSourceType(value);
    modelToDatasourceMap.set(key, dataSourceType);
  }
  return {
    modelToDatasourceMap,
  };
};
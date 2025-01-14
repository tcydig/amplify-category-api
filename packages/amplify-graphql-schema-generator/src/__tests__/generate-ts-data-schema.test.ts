import { MySQLDataSourceAdapter, PostgresDataSourceAdapter } from '../datasource-adapter';
import { Engine, Field, Model, Schema } from '../schema-representation';
import { generateTypescriptDataSchema } from '../ts-schema-generator/generate-ts-schema';
import { DataSourceGenerateConfig } from '../ts-schema-generator/helpers';
import { TypescriptDataSchemaGenerator } from '../ts-schema-generator/ts-schema-generator';

const mockMySqlAdapterInitialize = jest.spyOn(MySQLDataSourceAdapter.prototype, 'initialize').mockImplementation();
const mockMySqlAdapterGetModels = jest.spyOn(MySQLDataSourceAdapter.prototype, 'getModels').mockImplementation(() => {
  const model = new Model('User');
  model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
  model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
  model.setPrimaryKey(['id']);
  return [model];
});
const mockMySqlAdapterCleanup = jest.spyOn(MySQLDataSourceAdapter.prototype, 'cleanup').mockImplementation();

const mockPostgresAdapterInitialize = jest.spyOn(PostgresDataSourceAdapter.prototype, 'initialize').mockImplementation();
const mockPostgresAdapterGetModels = jest.spyOn(PostgresDataSourceAdapter.prototype, 'getModels').mockImplementation(() => {
  const model = new Model('Person');
  model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
  model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
  model.setPrimaryKey(['id']);
  return [model];
});
const mockPostgresAdapterCleanup = jest.spyOn(PostgresDataSourceAdapter.prototype, 'cleanup').mockImplementation();

jest.mock('../utils', () => ({
  getHostVpc: jest.fn(() => {
    return {
      vpcId: 'abc',
      securityGroupIds: ['sg0', 'sg1', 'sg2'],
      subnetAvailabilityZoneConfig: [
        {
          subnetId: 'sb0',
          availabilityZone: 'az0',
        },
        {
          subnetId: 'sb1',
          availabilityZone: 'az1',
        },
        {
          subnetId: 'sb2',
          availabilityZone: 'az2',
        },
      ],
    };
  }),
}));

beforeAll(() => {
  mockMySqlAdapterInitialize.mockClear();
  mockMySqlAdapterGetModels.mockClear();
  mockMySqlAdapterCleanup.mockClear();
  mockPostgresAdapterInitialize.mockClear();
  mockPostgresAdapterGetModels.mockClear();
  mockPostgresAdapterCleanup.mockClear();
});

describe('ts schema generator', () => {
  it('should generate schema with ssl certificate for mysql datasource adapter', async () => {
    const schema = await TypescriptDataSchemaGenerator.generate({
      engine: 'mysql',
      host: 'host',
      port: 3306,
      database: 'database',
      username: 'username',
      password: 'password',
      connectionUriSecretName: 'connectionUriSecret',
      sslCertificate: 'MYSQL_SSL_CERTIFICATE',
      sslCertificateSecretName: 'mySqlSslSecret',
    });
    expect(mockMySqlAdapterInitialize.mock.calls.length).toBe(1);
    expect(mockMySqlAdapterGetModels.mock.calls.length).toBe(1);
    expect(mockMySqlAdapterCleanup.mock.calls.length).toBe(1);
    expect(schema).toMatchSnapshot();
  });

  it('should generate schema with ssl certificate for postgres datasource adapter', async () => {
    const schema = await TypescriptDataSchemaGenerator.generate({
      engine: 'postgresql',
      host: 'host',
      port: 3306,
      database: 'database',
      username: 'username',
      password: 'password',
      connectionUriSecretName: 'connectionUriSecret',
      sslCertificate: 'POSTGRES_SSL_CERTIFICATE',
      sslCertificateSecretName: 'postgresSslSecret',
    });
    expect(mockPostgresAdapterInitialize.mock.calls.length).toBe(1);
    expect(mockPostgresAdapterGetModels.mock.calls.length).toBe(1);
    expect(mockPostgresAdapterCleanup.mock.calls.length).toBe(1);
    expect(schema).toMatchSnapshot();
  });
});

describe('Type name conversions', () => {
  it('ts schema generator should invoke generate schema', async () => {
    const dbschema = new Schema(new Engine('MySQL'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const buildSchemaMockMethod = jest.spyOn(TypescriptDataSchemaGenerator as any, 'buildSchema');
    buildSchemaMockMethod.mockImplementation(() => {
      return dbschema;
    });

    const schema = await TypescriptDataSchemaGenerator.generate({
      engine: 'mysql',
      host: 'host',
      port: 3306,
      database: 'database',
      username: 'username',
      password: 'password',
      connectionUriSecretName: 'secret',
    });
    expect(schema).toMatchSnapshot();
  });

  it('basic models should generate correct typescript data schema', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('check all valid datatypes', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    const model = new Model('Table');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('field1', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('field2', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('field3', { kind: 'Scalar', name: 'Int' }));
    model.addField(new Field('field4', { kind: 'Scalar', name: 'Float' }));
    model.addField(new Field('field5', { kind: 'Scalar', name: 'Boolean' }));
    model.addField(new Field('field6', { kind: 'Scalar', name: 'ID' }));
    model.addField(new Field('field7', { kind: 'Scalar', name: 'AWSDate' }));
    model.addField(new Field('field8', { kind: 'Scalar', name: 'AWSTime' }));
    model.addField(new Field('field9', { kind: 'Scalar', name: 'AWSDateTime' }));
    model.addField(new Field('field10', { kind: 'Scalar', name: 'AWSTimestamp' }));
    model.addField(new Field('field11', { kind: 'Scalar', name: 'AWSJSON' }));
    model.addField(new Field('field12', { kind: 'Scalar', name: 'AWSEmail' }));
    model.addField(new Field('field13', { kind: 'Scalar', name: 'AWSPhone' }));
    model.addField(new Field('field14', { kind: 'Scalar', name: 'AWSURL' }));
    model.addField(new Field('field15', { kind: 'Scalar', name: 'AWSIPAddress' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates enum imports correctly', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates required enums correctly', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('status', { kind: 'NonNull', type: { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] } }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates required  and null enums correctly in the same model', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.addField(new Field('statsu1', { kind: 'Enum', name: 'UserStatus1', values: ['ACTIVE', 'INACTIVE'] }));
    model.addField(new Field('status', { kind: 'NonNull', type: { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] } }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates single enum referenced for two different models', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const modelUser = new Model('User');
    const modelTest = new Model('Test');
    modelUser.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    modelUser.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    modelUser.addField(
      new Field('status', { kind: 'NonNull', type: { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] } }),
    );
    modelUser.setPrimaryKey(['id']);
    dbschema.addModel(modelUser);
    modelTest.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    modelTest.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    modelTest.addField(
      new Field('status', { kind: 'NonNull', type: { kind: 'Enum', name: 'UserStatus', values: ['ACTIVE', 'INACTIVE'] } }),
    );
    modelTest.setPrimaryKey(['id']);
    dbschema.addModel(modelTest);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generates enums for models in mysql', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    const modelUser = new Model('User');
    const modelTest = new Model('Test');
    modelUser.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    modelUser.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    modelUser.addField(
      new Field('status', { kind: 'NonNull', type: { kind: 'Enum', name: 'userStatus', values: ['ACTIVE', 'INACTIVE'] } }),
    );
    modelUser.setPrimaryKey(['id']);
    dbschema.addModel(modelUser);
    modelTest.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    modelTest.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    modelTest.addField(new Field('age', { kind: 'NonNull', type: { kind: 'Enum', name: 'TestAge', values: ['Above18', 'Below18'] } }));
    modelTest.setPrimaryKey(['id']);
    dbschema.addModel(modelTest);

    const graphqlSchema = generateTypescriptDataSchema(dbschema);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('schema with database config secret and vpc should generate typescript data schema with configure', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
      vpcConfig: {
        vpcId: '123',
        securityGroupIds: ['sb1', 'sb2', 'sb3'],
        subnetAvailabilityZoneConfig: [
          {
            subnetId: 'sb1',
            availabilityZone: 'az1',
          },
          {
            subnetId: 'sb2',
            availabilityZone: 'az2',
          },
          {
            subnetId: 'sb3',
            availabilityZone: 'az3',
          },
        ],
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('postgres schema with database config secret and vpc should generate typescript data schema with configure', () => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
      vpcConfig: {
        vpcId: '123',
        securityGroupIds: ['sb1'],
        subnetAvailabilityZoneConfig: [
          {
            subnetId: 'sb1',
            availabilityZone: 'az1',
          },
        ],
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it.each([
    {
      case: 'string',
      field: () => {
        const f = new Field('field', { kind: 'Scalar', name: 'String' });
        f.default = { kind: 'DB_GENERATED', value: 'A squat grey building of only thirty-four stouries' };
        return f;
      },
    },
    {
      case: 'Float',
      field: () => {
        const f = new Field('field', { kind: 'Scalar', name: 'Float' });
        f.default = { kind: 'DB_GENERATED', value: 3.14 };
        return f;
      },
    },
    {
      case: 'List',
      field: () => {
        const f = new Field('field', { kind: 'List', type: { kind: 'Scalar', name: 'String' } });
        f.default = { kind: 'DB_GENERATED', value: false };
        return f;
      },
    },
    {
      case: 'CustomType',
      field: () => {
        const f = new Field('field', { kind: 'Custom', name: 'MyCustomType' });
        f.default = { kind: 'DB_GENERATED', value: 'I could make of both names nothing longer or more explicit than Pip' };
        return f;
      },
    },
    {
      case: 'Transformer Generated',
      field: () => {
        const f = new Field('field', { kind: 'Scalar', name: 'Int' });
        f.default = { kind: 'TRANSFORMER_GENERATED', value: 42 };
        return f;
      },
    },
    {
      case: 'Default Integer Constant',
      field: () => {
        const f = new Field('field', { kind: 'Scalar', name: 'Int' });
        f.default = { kind: 'DB_GENERATED', value: 42 };
        return f;
      },
    },
    {
      case: 'No default',
      field: () => new Field('field', { kind: 'Scalar', name: 'Int' }),
    },
  ])('should not annotate fields with `.default()` where we do not support db generation (case: %case)', (test) => {
    const dbschema = new Schema(new Engine('Postgres'));
    const model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.setPrimaryKey(['id']);

    model.addField(test.field());

    dbschema.addModel(model);
    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    const containsDefault = graphqlSchema.includes('default()');
    expect(containsDefault).toBe(false);
  });

  it('should annotate scalar int fields with existing default with `.default()`', async () => {
    const dbschema = new Schema(new Engine('Postgres'));

    const model = new Model('CoffeeQueue');

    const serialPKField = new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'Int' } });
    serialPKField.default = { kind: 'DB_GENERATED', value: "nextval('coffeequeue_id_seq'::regclass)" };
    model.addField(serialPKField);
    model.setPrimaryKey(['id']);

    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));

    const serialField = new Field('orderNumber', { kind: 'Scalar', name: 'Int' });
    serialField.default = { kind: 'DB_GENERATED', value: "nextval('coffeequeue_ordernumber_seq'::regclass)" };
    model.addField(serialField);

    dbschema.addModel(model);
    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('schema with database config without vpc should generate typescript data schema with configure', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('schema with ssl certificate secret should generate valid typescript data schema', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
        sslCertificate: 'SSL_CERT',
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generate typescript data schema should skip processing tables without primary key', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    model.setPrimaryKey(['id']);
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    dbschema.addModel(model);

    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
    };

    const graphqlSchema = generateTypescriptDataSchema(dbschema, config);
    expect(graphqlSchema).toMatchSnapshot();
  });

  it('generate typescript data schema throw error if none of the tables have primary key', () => {
    const dbschema = new Schema(new Engine('MySQL'));
    let model = new Model('User');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('name', { kind: 'Scalar', name: 'String' }));
    dbschema.addModel(model);

    model = new Model('Profile');
    model.addField(new Field('id', { kind: 'NonNull', type: { kind: 'Scalar', name: 'String' } }));
    model.addField(new Field('details', { kind: 'Scalar', name: 'String' }));
    dbschema.addModel(model);

    const config: DataSourceGenerateConfig = {
      identifier: 'ID1234567890',
      secretNames: {
        connectionUri: 'CONN_STR',
      },
    };

    expect(() => generateTypescriptDataSchema(dbschema, config)).toThrow(
      'No valid tables found. Make sure at least one table has a primary key.',
    );
  });
});

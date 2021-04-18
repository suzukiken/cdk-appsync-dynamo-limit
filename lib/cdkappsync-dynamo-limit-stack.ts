import * as cdk from "@aws-cdk/core";
import * as dynamodb from "@aws-cdk/aws-dynamodb";
import * as appsync from "@aws-cdk/aws-appsync";

export class CdkappsyncDynamoLimitStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);
    
    const PREFIX_NAME = id.toLowerCase().replace('stack', '')
    const GSI_NAME = 'titleIndex'

    // appsync api

    const api = new appsync.GraphqlApi(this, "api", {
      name: PREFIX_NAME + "-api",
      logConfig: {
        fieldLogLevel: appsync.FieldLogLevel.ALL,
      },
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: appsync.AuthorizationType.API_KEY,
        },
      },
      schema: new appsync.Schema({
        filePath: "graphql/schema.graphql",
      }),
    })

    // Dynamo Table and register as resolver

    const table = new dynamodb.Table(this, "table", {
      tableName: PREFIX_NAME + "-table",
      partitionKey: {
        name: "id",
        type: dynamodb.AttributeType.STRING,
      },
      removalPolicy: cdk.RemovalPolicy.DESTROY
    })
    
    table.addGlobalSecondaryIndex({
      indexName: GSI_NAME,
      partitionKey: {
        name: "title",
        type: dynamodb.AttributeType.STRING,
      },
    })
    
    // Datasource

    const dynamo_datasource = api.addDynamoDbDataSource(
      "dynamo_datasource",
      table
    )
    
    // Resolver
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "getProduct",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbGetItem(
        "id",
        "id"
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    });
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "listProducts",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        "mapping_template/list_products.vtl"
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        "mapping_template/list_products_response.vtl"
      )
    })
    
    dynamo_datasource.createResolver({
      typeName: "Query",
      fieldName: "listProductsByTitle",
      requestMappingTemplate: appsync.MappingTemplate.fromFile(
        "mapping_template/list_products_by_title.vtl"
      ),
      responseMappingTemplate: appsync.MappingTemplate.fromFile(
        "mapping_template/list_products_response.vtl"
      )
    })
    
    dynamo_datasource.createResolver({
      typeName: "Mutation",
      fieldName: "addProduct",
      requestMappingTemplate: appsync.MappingTemplate.dynamoDbPutItem(
        appsync.PrimaryKey.partition("id").auto(),
        appsync.Values.projecting("input")
      ),
      responseMappingTemplate: appsync.MappingTemplate.dynamoDbResultItem(),
    })
    
    // Output
    // Set these params to enviroment varibles at test/set_enviroment_variable.sh
    
    if (api.apiKey) {
      new cdk.CfnOutput(this, "apikey_output", { value: api.apiKey })
    }
    
    new cdk.CfnOutput(this, "graphql_url_output", { value: api.graphqlUrl })
    
  }
}

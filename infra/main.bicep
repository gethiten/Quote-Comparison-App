targetScope = 'resourceGroup'

@description('Primary Azure region for the app resources.')
param location string = resourceGroup().location

@description('Region for Azure AI Services / Content Understanding.')
param aiLocation string = 'eastus'

@description('Deployment environment tag.')
@allowed([
  'dev'
  'test'
  'prod'
])
param environmentName string = 'dev'

@description('Azure Storage account name for uploaded quote documents and optional static website hosting.')
param storageAccountName string = 'quotecomparestr2026'

@description('Blob container that stores quote documents.')
param blobContainerName string = 'quote-documents'

@description('PostgreSQL flexible server name.')
param postgresServerName string = 'quotecompare-pgserver'

@description('Application database name.')
param postgresDatabaseName string = 'quote_comparison'

@description('PostgreSQL administrator login name.')
param dbAdminLogin string = 'quoteadmin'

@secure()
@description('PostgreSQL administrator password.')
param dbAdminPassword string

@description('Optional client IP address to allow through the PostgreSQL firewall. Leave blank to skip.')
param allowedClientIp string = ''

@description('Linux App Service plan name for the Azure Function.')
param functionPlanName string = 'quotecompare-plan'

@description('Azure Function App name.')
param functionAppName string = 'quotecompare-func'

@description('Linux App Service plan name for the FastAPI backend.')
param backendPlanName string = 'quotecompare-api-plan'

@description('FastAPI backend Web App name.')
param backendWebAppName string = 'quotecompare-api'

@description('Whether to provision the FastAPI backend Web App.')
param enableBackendWebApp bool = false

@description('Azure AI Services account name used for Azure OpenAI and Content Understanding.')
param aiAccountName string = 'quotecompare-cu'

@description('Azure AI Foundry project name hosted under the AI Services account.')
param foundryProjectName string = 'quotecompare-project'

@description('Azure Communication Services resource name.')
param communicationServiceName string = 'quotecompare-comm'

@description('Azure Communication Email Service resource name.')
param emailServiceName string = 'quotecompare-email'

@description('Managed email domain resource name.')
param emailDomainName string = 'AzureManagedDomain'

@description('Primary Azure OpenAI deployment name used by the app.')
param openAiDeploymentName string = 'gpt-4.1'

@description('Secondary lightweight Azure OpenAI deployment name used for fallback and CU scenarios.')
param openAiMiniDeploymentName string = 'gpt-4.1-mini'

@description('Embedding model deployment name used by Content Understanding.')
param embeddingDeploymentName string = 'text-embedding-3-large'

@description('Model version for the primary GPT deployment.')
param openAiDeploymentVersion string = '2025-04-14'

@description('Model version for the lightweight GPT deployment.')
param openAiMiniDeploymentVersion string = '2025-04-14'

@description('Model version for the embeddings deployment.')
param embeddingDeploymentVersion string = '1'

@description('Capacity for the primary GPT deployment.')
param openAiDeploymentCapacity int = 10

@description('Capacity for the lightweight GPT deployment.')
param openAiMiniDeploymentCapacity int = 10

@description('Capacity for the embeddings deployment.')
param embeddingDeploymentCapacity int = 120

@description('Content Understanding analyzer identifier.')
param contentUnderstandingAnalyzerId string = 'insuranceQuoteExtractor'

@description('Notification email address used by the Function App after quote processing.')
param notificationEmail string = 'replace-me@example.com'

@description('Azure Communication Services sender email address used by the Function App.')
param communicationSender string = 'replace-me@contoso.com'

@description('PostgreSQL compute SKU name.')
param postgresSkuName string = 'Standard_B1ms'

@description('App Service SKU for the backend and Function App plans.')
param appServiceSkuName string = 'B1'

var tags = {
  app: 'quote-comparison-app'
  environment: environmentName
  managedBy: 'bicep'
}

var aiEndpoint = 'https://${aiAccountName}.cognitiveservices.azure.com/'
var postgresFqdn = '${postgresServerName}.postgres.database.azure.com'
var databaseUrl = 'postgresql://${dbAdminLogin}:${dbAdminPassword}@${postgresFqdn}:5432/${postgresDatabaseName}?sslmode=require'
var storageDnsSuffix = environment().suffixes.storage
var blobServiceUri = 'https://${storageAccountName}.blob.${storageDnsSuffix}'
var queueServiceUri = 'https://${storageAccountName}.queue.${storageDnsSuffix}'
var communicationConnectionString = communicationService.listKeys().primaryConnectionString
var storageBlobReaderRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '2a2b9908-6ea1-4ae2-8e65-a410df84e7d1')
var storageBlobContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')
var storageQueueContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '974c5e8b-45b9-4653-ba55-5f855dd0fb88')
var storageAccountContributorRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '17d1049b-9a84-46fb-8f53-869881c3d3ab')
var storageBlobOwnerRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'b7e6dc6d-f1e8-4753-8033-0f276bb0955b')
var cognitiveServicesUserRoleId = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'a97b65f3-24c7-4388-baec-2e87135dc908')

resource storage 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  tags: tags
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
  }
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = {
  name: 'default'
  parent: storage
  properties: {
    deleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    containerDeleteRetentionPolicy: {
      enabled: true
      days: 7
    }
    changeFeed: {
      enabled: true
    }
    isVersioningEnabled: true
    restorePolicy: {
      enabled: true
      days: 6
    }
    cors: {
      corsRules: []
    }
  }
}

resource quoteContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = {
  name: blobContainerName
  parent: blobService
  properties: {
    publicAccess: 'None'
  }
}

resource queueService 'Microsoft.Storage/storageAccounts/queueServices@2023-05-01' = {
  name: 'default'
  parent: storage
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = if (enableBackendWebApp) {
  name: '${backendWebAppName}-appi'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
  }
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = {
  name: postgresServerName
  location: location
  sku: {
    name: postgresSkuName
    tier: 'Burstable'
  }
  tags: tags
  properties: {
    version: '16'
    administratorLogin: dbAdminLogin
    administratorLoginPassword: dbAdminPassword
    createMode: 'Create'
    availabilityZone: '1'
    storage: {
      storageSizeGB: 32
      autoGrow: 'Enabled'
      tier: 'P4'
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: {
      mode: 'Disabled'
    }
    network: {
      publicNetworkAccess: 'Enabled'
    }
  }
}

resource postgresDb 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = {
  name: postgresDatabaseName
  parent: postgresServer
  properties: {
    charset: 'UTF8'
    collation: 'en_US.utf8'
  }
}

resource postgresAllowAzure 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = {
  name: 'AllowAzureServices'
  parent: postgresServer
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}

resource postgresAllowClient 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = if (!empty(allowedClientIp)) {
  name: 'AllowClientIp'
  parent: postgresServer
  properties: {
    startIpAddress: allowedClientIp
    endIpAddress: allowedClientIp
  }
}

resource aiServices 'Microsoft.CognitiveServices/accounts@2025-06-01' = {
  name: aiAccountName
  location: aiLocation
  kind: 'AIServices'
  sku: {
    name: 'S0'
  }
  tags: tags
  properties: {
    customSubDomainName: toLower(aiAccountName)
    publicNetworkAccess: 'Enabled'
    disableLocalAuth: true
    allowProjectManagement: true
  }
}

resource aiFoundryProject 'Microsoft.CognitiveServices/accounts/projects@2025-06-01' = {
  name: foundryProjectName
  parent: aiServices
  location: aiLocation
  identity: {
    type: 'SystemAssigned'
  }
  properties: {}
}

resource gpt41Deployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: openAiDeploymentName
  parent: aiServices
  sku: {
    name: 'GlobalStandard'
    capacity: openAiDeploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4.1'
      version: openAiDeploymentVersion
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

resource gpt41MiniDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: openAiMiniDeploymentName
  parent: aiServices
  sku: {
    name: 'GlobalStandard'
    capacity: openAiMiniDeploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4.1-mini'
      version: openAiMiniDeploymentVersion
    }
    raiPolicyName: 'Microsoft.Default'
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

resource embeddingDeployment 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  name: embeddingDeploymentName
  parent: aiServices
  sku: {
    name: 'GlobalStandard'
    capacity: embeddingDeploymentCapacity
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'text-embedding-3-large'
      version: embeddingDeploymentVersion
    }
    versionUpgradeOption: 'OnceNewDefaultVersionAvailable'
  }
}

resource emailService 'Microsoft.Communication/emailServices@2023-06-01-preview' = {
  name: emailServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'UnitedStates'
  }
}

resource emailDomain 'Microsoft.Communication/emailServices/domains@2023-06-01-preview' = {
  name: emailDomainName
  parent: emailService
  location: 'global'
  tags: tags
  properties: {
    domainManagement: 'AzureManaged'
    userEngagementTracking: 'Disabled'
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: communicationServiceName
  location: 'global'
  tags: tags
  properties: {
    dataLocation: 'UnitedStates'
    linkedDomains: [
      emailDomain.id
    ]
  }
}

resource functionPlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: functionPlanName
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSkuName
    tier: 'Basic'
    size: appServiceSkuName
    capacity: 1
  }
  tags: tags
  properties: {
    reserved: true
  }
}

resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: functionAppName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  tags: tags
  properties: {
    serverFarmId: functionPlan.id
    httpsOnly: true
    clientAffinityEnabled: false
  }
}

resource functionWebConfig 'Microsoft.Web/sites/config@2023-12-01' = {
  name: 'web'
  parent: functionApp
  properties: {
    linuxFxVersion: 'Python|3.11'
    alwaysOn: true
    ftpsState: 'Disabled'
    minTlsVersion: '1.2'
  }
}

resource functionAppSettings 'Microsoft.Web/sites/config@2023-12-01' = {
  name: 'appsettings'
  parent: functionApp
  properties: {
    FUNCTIONS_EXTENSION_VERSION: '~4'
    FUNCTIONS_WORKER_RUNTIME: 'python'
    AzureWebJobsStorage__accountName: storage.name
    QuoteStorage__blobServiceUri: blobServiceUri
    QuoteStorage__queueServiceUri: queueServiceUri
    CU_ENDPOINT: aiEndpoint
    PG_HOST: postgresFqdn
    PG_DATABASE: postgresDatabaseName
    PG_USER: dbAdminLogin
    PG_PASSWORD: dbAdminPassword
    ENABLE_ORYX_BUILD: 'true'
    SCM_DO_BUILD_DURING_DEPLOYMENT: '1'
    ACS_CONNECTION_STRING: communicationConnectionString
    ACS_SENDER: communicationSender
    NOTIFICATION_EMAIL: notificationEmail
  }
}

resource functionBlobReaderRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.name, 'blob-data-reader')
  scope: storage
  properties: {
    roleDefinitionId: storageBlobReaderRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionBlobRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.name, 'blob-data-contributor')
  scope: storage
  properties: {
    roleDefinitionId: storageBlobContributorRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionQueueRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.name, 'queue-data-contributor')
  scope: storage
  properties: {
    roleDefinitionId: storageQueueContributorRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionStorageAccountContributorRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.name, 'storage-account-contributor')
  scope: storage
  properties: {
    roleDefinitionId: storageAccountContributorRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionBlobOwnerRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(storage.id, functionApp.name, 'blob-data-owner')
  scope: storage
  properties: {
    roleDefinitionId: storageBlobOwnerRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource functionCognitiveServicesUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(aiServices.id, functionApp.name, 'cognitive-services-user')
  scope: aiServices
  properties: {
    roleDefinitionId: cognitiveServicesUserRoleId
    principalId: functionApp.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

resource backendPlan 'Microsoft.Web/serverfarms@2023-12-01' = if (enableBackendWebApp) {
  name: backendPlanName
  location: location
  kind: 'linux'
  sku: {
    name: appServiceSkuName
    tier: 'Basic'
    size: appServiceSkuName
    capacity: 1
  }
  tags: tags
  properties: {
    reserved: true
  }
}

resource backendWebApp 'Microsoft.Web/sites@2023-12-01' = if (enableBackendWebApp) {
  name: backendWebAppName
  location: location
  kind: 'app,linux'
  identity: {
    type: 'SystemAssigned'
  }
  tags: tags
  properties: {
    serverFarmId: backendPlan.id
    httpsOnly: true
    clientAffinityEnabled: false
  }
}

resource backendWebConfig 'Microsoft.Web/sites/config@2023-12-01' = if (enableBackendWebApp) {
  name: 'web'
  parent: backendWebApp
  properties: {
    linuxFxVersion: 'PYTHON|3.12'
    alwaysOn: true
    ftpsState: 'Disabled'
    minTlsVersion: '1.2'
    appCommandLine: 'gunicorn -k uvicorn.workers.UvicornWorker app.main:app --bind=0.0.0.0:$PORT'
  }
}

resource backendAppSettings 'Microsoft.Web/sites/config@2023-12-01' = if (enableBackendWebApp) {
  name: 'appsettings'
  parent: backendWebApp
  properties: {
    SCM_DO_BUILD_DURING_DEPLOYMENT: 'true'
    ENABLE_ORYX_BUILD: 'true'
    WEBSITE_RUN_FROM_PACKAGE: '0'
    APP_ENV: environmentName
    CORS_ORIGINS: 'http://localhost:5173,http://localhost:3000'
    DATABASE_URL: databaseUrl
    AZURE_STORAGE_CONTAINER: blobContainerName
    AZURE_OPENAI_ENDPOINT: aiEndpoint
    AZURE_OPENAI_DEPLOYMENT: openAiDeploymentName
    AZURE_OPENAI_API_KEY: ''
    AZURE_OPENAI_API_VERSION: '2025-01-01-preview'
    AZURE_CONTENT_UNDERSTANDING_ENDPOINT: aiEndpoint
    AZURE_CONTENT_UNDERSTANDING_ANALYZER_ID: contentUnderstandingAnalyzerId
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights!.properties.ConnectionString
  }
}

resource backendCognitiveServicesUserRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (enableBackendWebApp) {
  name: guid(aiServices.id, backendWebApp.name, 'cognitive-services-user')
  scope: aiServices
  properties: {
    roleDefinitionId: cognitiveServicesUserRoleId
    principalId: backendWebApp!.identity.principalId
    principalType: 'ServicePrincipal'
  }
}

output storageAccountResourceName string = storage.name
output quoteDocumentsContainer string = quoteContainer.name
output postgresServerFqdn string = postgresFqdn
output postgresDatabase string = postgresDb.name
output aiServicesEndpoint string = aiEndpoint
output aiFoundryProjectResourceId string = aiFoundryProject.id
output aiFoundryProjectApiUrl string = 'https://${aiAccountName}.services.ai.azure.com/api/projects/${foundryProjectName}'
output contentUnderstandingAnalyzerName string = contentUnderstandingAnalyzerId
output communicationServiceNameOut string = communicationService.name
output emailServiceNameOut string = emailService.name
output emailSenderDomain string = emailDomain.properties.fromSenderDomain
output functionAppUrl string = 'https://${functionApp.name}.azurewebsites.net'
output backendWebAppUrl string = enableBackendWebApp ? 'https://${backendWebAppName}.azurewebsites.net' : ''
output storageBlobServiceUrl string = blobServiceUri
output storageQueueServiceUrl string = queueServiceUri

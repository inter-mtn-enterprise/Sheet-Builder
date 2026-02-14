export interface SalesforceToken {
  access_token: string
  refresh_token?: string
  instance_url: string
  token_type: string
  issued_at: string
  expires_in?: number
}

export interface SalesforceProduct {
  Id: string
  Name: string
  StockKeepingUnit?: string
  ProductCode?: string
  IsActive?: boolean
}

export interface SalesforceProductCategory {
  Id: string
  Name: string
  CatalogId?: string
  ParentCategoryId?: string  // if hierarchical
}

export interface SalesforceProductCategoryProduct {
  Id: string
  ProductId: string  // Product2.Id
  ProductCategoryId: string  // ProductCategory.Id
}

export interface SalesforceProductMedia {
  Id: string
  ProductId: string
  MediaId?: string
  ElectronicMediaId?: string
}

export interface SalesforceManagedContent {
  Id: string
  ContentKey?: string
  ManagedContentTypeId?: string
}

export interface SalesforceQueryResponse<T> {
  totalSize: number
  done: boolean
  records: T[]
  nextRecordsUrl?: string
}

export interface SalesforceApiLimit {
  Max: number
  Remaining: number
}

export interface SalesforceApiLimits {
  DailyApiRequests?: SalesforceApiLimit
  DailyBulkApiRequests?: SalesforceApiLimit
  DailyStreamingApiEvents?: SalesforceApiLimit
  DailyGenericStreamingApiEvents?: SalesforceApiLimit
  DailyStreamingApiEventsExtension?: SalesforceApiLimit
  ConcurrentAsyncGetReportInstances?: SalesforceApiLimit
  ConcurrentSyncReportRuns?: SalesforceApiLimit
  [key: string]: SalesforceApiLimit | undefined
}


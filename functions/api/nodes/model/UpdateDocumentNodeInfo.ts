export interface UpdateNodeInfo {
  pageId: string
  version: number
  nodes: Array<UpdateNodeInfo>
}

export interface UpdateDocumentNodeInfo {
  documentId: string
  updateNodeInfo: UpdateNodeInfo
}

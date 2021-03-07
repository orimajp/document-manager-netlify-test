import { BulkWriteOperation, ObjectId } from 'mongodb'
import { Collections, Node, Page } from '../db/DbService'
import { RegisterPageFirstNodeInfo } from './model/RegisterPageFirstNodeInfo'
import { RegisterDocumentNodeInfo } from './model/RegisterDocumentNodeInfo'
import { RegisterPagePreventChileTargetNodeInfo } from './model/RegisterPagePreventChileTargetNodeInfo'
import { RegisterPageAppendNextTargetNodeInfo } from './model/RegisterPageAppendNextTargetNodeInfo'
import {
  UpdateDocumentNodeInfo,
  UpdateNodeInfo
} from './model/UpdateDocumentNodeInfo'

interface ModifiableNode {
  pageId: string
  parentId: string
  nodes: Array<string>
  version: number
}

/**
 * ノードサービス
 */
export class NodeService {
  constructor(private readonly collections: Collections) {}

  // ドキュメントノード登録
  async registerDocumentNode(
    registerDocumentNodeInfo: RegisterDocumentNodeInfo
  ): Promise<void> {
    const oDocumentId = new ObjectId(registerDocumentNodeInfo.documentId)
    const newNode: Node = {
      _id: oDocumentId,
      documentId: oDocumentId,
      parentId: oDocumentId,
      nodes: [],
      version: 1
    }

    // 登録は上手くいく前提
    await this.collections.nodes.insertOne(newNode)
  }

  // ドキュメント先頭にページ追加
  async registerPageFirstNode(
    registerPageFirstNodeInfo: RegisterPageFirstNodeInfo
  ): Promise<boolean> {
    const oDocumentId = new ObjectId(registerPageFirstNodeInfo.documentId)
    const node = await this.collections.nodes.findOne<Node>({
      _id: oDocumentId
    })
    // FIXME 削除されている可能性はある
    if (!node) {
      throw new Error('ページ未発見')
    }

    const nodes = node.nodes
    const oPageId = new ObjectId(registerPageFirstNodeInfo.pageId)
    nodes.unshift(oPageId)
    const updateResult = await this.collections.nodes.updateOne(
      {
        _id: oDocumentId,
        version: node.version
      },
      {
        $set: {
          nodes
        },
        $inc: {
          version: 1
        }
      }
    )

    if (updateResult.modifiedCount !== 1) {
      return false
    }

    const newNode: Node = {
      _id: oPageId,
      documentId: oDocumentId,
      parentId: oDocumentId,
      nodes: [],
      version: 1
    }

    // 登録は上手くいく前提
    await this.collections.nodes.insertOne(newNode)

    return true
  }

  // 子要素の先頭にページ追加
  async registerPagePreventChileTargetNode(
    registerPagePreventChileTargetNodeInfo: RegisterPagePreventChileTargetNodeInfo
  ): Promise<boolean> {
    const oTargetPageId = new ObjectId(
      registerPagePreventChileTargetNodeInfo.targetPageId
    )
    const node = await this.collections.nodes.findOne<Node>({
      _id: oTargetPageId
    })
    // FIXME 削除されている可能性はある
    if (!node) {
      throw new Error('ページ未発見')
    }

    const nodes = node.nodes
    const oPageId = new ObjectId(registerPagePreventChileTargetNodeInfo.pageId)
    nodes.unshift(oPageId)
    const updateResult = await this.collections.nodes.updateOne(
      {
        _id: oTargetPageId,
        version: node.version
      },
      {
        $set: {
          nodes
        },
        $inc: {
          version: 1
        }
      }
    )

    if (updateResult.modifiedCount !== 1) {
      return false
    }

    const oDocumentId = new ObjectId(
      registerPagePreventChileTargetNodeInfo.documentId
    )
    const newNode: Node = {
      _id: oPageId,
      documentId: oDocumentId,
      parentId: oTargetPageId,
      nodes: [],
      version: 1
    }

    // 登録は上手くいく前提
    await this.collections.nodes.insertOne(newNode)

    return true
  }

  // 次要素にページ追加
  async registerPageAppendNextTargetNode(
    registerPageAppendNextTargetNodeInfo: RegisterPageAppendNextTargetNodeInfo
  ): Promise<boolean> {
    const oTargetPageId = new ObjectId(
      registerPageAppendNextTargetNodeInfo.targetPageId
    )
    const node = await this.collections.nodes.findOne<Node>({
      _id: oTargetPageId
    })
    // FIXME 削除されている可能性はある
    if (!node) {
      throw new Error('ページ未発見')
    }

    const parentNode = await this.collections.nodes.findOne<Node>({
      _id: node.parentId
    })
    if (!parentNode) {
      throw new Error('親ページ未発見')
    }

    const nodes = parentNode.nodes
    const oPageId = new ObjectId(registerPageAppendNextTargetNodeInfo.pageId)
    const addedNodes = nodes.concat(oPageId)
    const updateResult = await this.collections.nodes.updateOne(
      {
        _id: node.parentId,
        version: node.version
      },
      {
        $set: {
          nodes: addedNodes
        },
        $inc: {
          version: 1
        }
      }
    )

    if (updateResult.modifiedCount !== 1) {
      return false
    }

    const oDocumentId = new ObjectId(
      registerPageAppendNextTargetNodeInfo.documentId
    )
    const newNode: Node = {
      _id: oPageId,
      documentId: oDocumentId,
      parentId: parentNode._id as ObjectId,
      nodes: [],
      version: 1
    }

    // 登録は上手くいく前提
    await this.collections.nodes.insertOne(newNode)

    return true
  }

  // ノード削除
  async deleteNodeInfo(pageId: string): Promise<void> {
    await this.collections.nodes.deleteOne({
      _id: new ObjectId(pageId)
    })
  }

  // ノードリスト更新
  async updateDocumentNodes(
    updateDocumentNodeInfo: UpdateDocumentNodeInfo
  ): Promise<boolean> {
    // ノード更新対象ドキュメント取得
    const page = await this.collections.pages.findOne<Page>({
      _id: new ObjectId(updateDocumentNodeInfo.documentId)
    })
    if (!page) {
      return false
    }

    // 更新ノードをMap化
    const iNodeKeyMap = createINodeKeyMap(updateDocumentNodeInfo)

    // ノードカーソル取得
    const nodeCursor = await this.collections.nodes.find({
      documentId: new ObjectId(updateDocumentNodeInfo.documentId)
    })

    // 件数比較、違ってたらエラー
    const iNodeKeyCount = iNodeKeyMap.size
    const nodeCount = await nodeCursor.count()
    // documentノード分加算して比較
    if (iNodeKeyCount + 1 !== nodeCount) {
      throw new Error(
        '更新件数不一致 iNodeKeyCount=' +
          iNodeKeyCount +
          ', nodeCount=' +
          nodeCount
      )
    }

    // ドキュメントNode配列
    const documentNodes = updateDocumentNodeInfo.updateNodeInfo.nodes

    // ノードリスト更新、マッチしなかったらエラー
    const nodeList = await nodeCursor.toArray()
    updateNodeList(documentNodes, iNodeKeyMap, nodeList)

    // ノードリスト保存

    const updateNodeCommandList = createUpdateNodeCommandList(nodeList)
    const results = await this.collections.nodes.bulkWrite(
      updateNodeCommandList
    )
    if (results.upsertedCount !== nodeCount) {
      throw new Error('更新実行件数エラー')
    }

    return true
  }
}

function createUpdateNodeCommandList(
  nodes: Array<Node>
): Array<BulkWriteOperation<Node>> {
  const list: Array<BulkWriteOperation<Node>> = []
  nodes.forEach((node) => {
    list.push({
      updateOne: {
        filter: {
          _id: node._id,
          version: node.version
        },
        update: {
          $set: {
            documentId: node.documentId,
            parentId: node.parentId,
            nodes: node.nodes
          },
          $inc: {
            version: 1
          }
        }
      }
    })
  })
  return list
}

function updateNodeList(
  documentNodes: Array<UpdateNodeInfo>,
  iNodeKeyMap: Map<string, ModifiableNode>,
  nodeList: Array<Node>
): void {
  nodeList.forEach((node) => {
    if (node._id?.toHexString() === node.documentId.toHexString()) {
      const documentNode = node
      const oDocumentChildIds: Array<ObjectId> = []
      documentNodes.forEach((node) => {
        oDocumentChildIds.push(new ObjectId(node.pageId))
      })
      documentNode.nodes = oDocumentChildIds
    } else {
      const modifyNode = iNodeKeyMap.get(node._id?.toHexString() as string)
      if (!modifyNode) {
        throw new Error('更新ノード不一致')
      }
      node.parentId = new ObjectId(modifyNode.parentId)
      const nodes: Array<ObjectId> = []
      modifyNode.nodes.forEach((childId) => {
        nodes.push(new ObjectId(childId))
      })
      node.nodes = nodes
    }
  })
}

function createINodeKeyMap(
  updateDocumentNodeInfo: UpdateDocumentNodeInfo
): Map<string, ModifiableNode> {
  const iNodeKeyMap = new Map<string, ModifiableNode>()
  updateDocumentNodeInfo.updateNodeInfo.nodes.forEach((node) => {
    updateINodeKeyMap(
      node.pageId,
      updateDocumentNodeInfo.documentId,
      node.version,
      node.nodes,
      iNodeKeyMap
    )
  })
  return iNodeKeyMap
}

function updateINodeKeyMap(
  pageId: string,
  parentId: string,
  version: number,
  nodes: Array<UpdateNodeInfo>,
  iNodeKeyMap: Map<string, ModifiableNode>
): void {
  const childrenKey: Array<string> = []
  nodes.forEach((node) => {
    childrenKey.push(node.pageId)
  })
  const modifiableNode: ModifiableNode = {
    pageId,
    parentId,
    nodes: childrenKey,
    version
  }
  iNodeKeyMap.set(pageId, modifiableNode)
  nodes.forEach((node) => {
    updateINodeKeyMap(
      node.pageId,
      pageId,
      node.version,
      node.nodes,
      iNodeKeyMap
    )
  })
}

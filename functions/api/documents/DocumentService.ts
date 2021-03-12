import { ObjectId } from 'mongodb'
import { Group, Collections, Document, Page, User } from '../db/DbService'
import { DecodeTokenInfo } from '../auth/DecodeTokenInfo'
import { createSearchData } from '../shared/SearchDataCreator'
import { DocumentInfo } from './model/DocumentInfo'
import { RegisterDocument } from './model/RegisterDocument'
import { UpdateDocumentGroupInfo } from './model/UpdateDocumentGroupInfo'
import { DocumentListInfo } from './model/DocumentListInfo'
import { DocumentIndexInfo } from './model/DocumentIndexInfo'
import { ArchiveDocumentInfo } from './model/ArchiveDocumentInfo'
import { LockDocumentInfo } from './model/LockDocumentInfo'
import { DeleteDocumentInfo } from './model/DeleteDocumentInfo'
import { SearchDocumentIndexInfo } from './model/SearchDocumentIndexInfo'

/**
 * ドキュメントサービス
 */
export class DocumentService {
  constructor(private readonly collections: Collections) {}

  // ドキュメントリスト取得
  async getDocumentList(): Promise<Array<DocumentListInfo>> {
    const ducumentList: Array<DocumentListInfo> = []
    await this.collections.documents
      .aggregate<Document & { page: Page } & { group: Group }>([
        {
          $lookup: {
            from: 'pages',
            localField: '_id',
            foreignField: 'documentId',
            as: 'page'
          }
        },
        {
          $unwind: '$page'
        },
        {
          $lookup: {
            from: 'groups',
            localField: 'groupId',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $unwind: '$group'
        },
        {
          $sort: {
            'page.updateDate': -1
          }
        }
      ])
      .toArray()
      .then((documentPageGroups) => {
        documentPageGroups.forEach((documentPageGroup) => {
          const page = documentPageGroup.page
          const group = documentPageGroup.group
          const documentListInfo: DocumentListInfo = {
            documentId: documentPageGroup._id?.toHexString() as string,
            pageTitle: page.pageTitle,
            editLock: documentPageGroup.editLock,
            archive: documentPageGroup.archive,
            groupId: documentPageGroup.groupId.toHexString(),
            groupName: group.name
          }
          ducumentList.push(documentListInfo)
        })
      })

    return ducumentList
  }

  // ドキュメント取得
  async getDocumentById(documentId: string): Promise<DocumentInfo | null> {
    const group = await this.getGroupByDocumentId(documentId)
    if (!group) {
      throw new Error('グループ未発見')
    }

    const documentInfos: Array<DocumentInfo> = []
    await this.collections.pages
      .aggregate<
        Page & { document: Document } & { registerUser: User } & {
          updateUser: User
        }
      >([
        {
          $match: { documentId: new ObjectId(documentId) }
        },
        {
          $lookup: {
            from: 'documents',
            localField: '_id',
            foreignField: '_id',
            as: 'document'
          }
        },
        {
          $unwind: '$document'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'registerUserId',
            foreignField: '_id',
            as: 'registerUser'
          }
        },
        {
          $unwind: '$registerUser'
        },
        {
          $lookup: {
            from: 'users',
            localField: 'updateUserId',
            foreignField: '_id',
            as: 'updateUser'
          }
        },
        {
          $unwind: '$updateUser'
        }
      ])
      .toArray()
      .then((pageDocuments) => {
        pageDocuments.forEach((pageDocument) => {
          const document = pageDocument.document
          const registerUser = pageDocument.registerUser
          const updateUser = pageDocument.updateUser
          const documentInfo: DocumentInfo = {
            documentId,
            pageTitle: pageDocument.pageTitle,
            pageData: pageDocument.pageData,
            editLock: document.editLock,
            archive: document.archive,
            groupId: document.groupId.toHexString(),
            groupName: group.name,
            pageRegisterDate: pageDocument.registerDate.toISOString(),
            pageRegisterUserId: pageDocument.registerUserId.toHexString() || '',
            pageRegisterUserName: registerUser.userName,
            pageUpdateDate: pageDocument.updateDate.toISOString(),
            pageUpdateUserId: pageDocument.updateUserId.toHexString() || '',
            pageUpdateUserName: updateUser.userName,
            pageVersion: pageDocument.version
          }
          documentInfos.push(documentInfo)
        })
      })

    if (!documentInfos.length) {
      return null
    }

    return documentInfos[0]
  }

  // ドキュメント登録
  async registerDocument(
    registerDocumentInfo: RegisterDocument,
    userInfo: DecodeTokenInfo
  ): Promise<string> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userInfo.userId)
    })
    // FIXME userがnullの場合は？

    const oGroupId = new ObjectId(registerDocumentInfo.groupId || '0')
    // FIXME 存在しないグループの場合は？
    const now = new Date()

    const documentResult = await this.collections.documents.insertOne({
      groupId: oGroupId,
      editLock: false,
      archive: false,
      registerDate: now,
      registerUserId: user?._id as ObjectId,
      updateDate: now,
      updateUserId: user?._id as ObjectId,
      version: 0
    })

    const documentId = documentResult.insertedId
    await this.collections.pages.insertOne({
      _id: documentId,
      documentId,
      pageTitle: registerDocumentInfo.pageTitle,
      pageData: registerDocumentInfo.pageData,
      searchData: createSearchData(registerDocumentInfo.pageData),
      delete: false,
      registerDate: now,
      registerUserId: user?._id as ObjectId,
      updateDate: now,
      updateUserId: user?._id as ObjectId,
      version: 0
    })

    return documentId.toHexString()
  }

  // グループ変更
  async updateDocumentGroup(
    updateDocumentGroupInfo: UpdateDocumentGroupInfo,
    userInf: DecodeTokenInfo
  ): Promise<boolean> {
    const now = new Date()
    const oGroupId = new ObjectId(updateDocumentGroupInfo.groupId)
    const group = await this.collections.groups.findOne({
      _id: oGroupId
    })
    if (!group) {
      throw new Error('グループ未発見')
    }

    const result = await this.collections.documents.updateOne(
      {
        _id: new ObjectId(updateDocumentGroupInfo.documentId),
        version: updateDocumentGroupInfo.version
      },
      {
        $set: {
          groupId: oGroupId,
          updateDate: now,
          updateUserId: new ObjectId(userInf.userId)
        },
        $inc: {
          version: 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // ドキュメント削除(物理削除)
  async deleteDocument(
    deleteDocumentInfo: DeleteDocumentInfo
  ): Promise<boolean> {
    const oDocumentId = new ObjectId(deleteDocumentInfo.documentId)
    await this.collections.pages.deleteMany({
      documentId: oDocumentId
    })

    await this.collections.nodes.deleteOne({
      documentId: oDocumentId
    })

    const result = await this.collections.documents.deleteOne({
      _id: oDocumentId
    })

    return result.deletedCount !== 1
  }

  // ドキュメントアーカイブ
  async archiveDocument(
    archiveDocumentInfo: ArchiveDocumentInfo,
    userInf: DecodeTokenInfo
  ): Promise<boolean> {
    const now = new Date()
    // ドキュメントの更新情報(ユーザID、更新日、バージョンなど)
    const result = await this.collections.documents.updateOne(
      {
        _id: new ObjectId(archiveDocumentInfo.documentId),
        version: archiveDocumentInfo.version
      },
      {
        $set: {
          archive: archiveDocumentInfo.archive,
          updateDate: now,
          updateUserId: new ObjectId(userInf.userId)
        },
        $inc: {
          version: 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // ドキュメントロック
  async lockDocument(
    lockDocumentInfo: LockDocumentInfo,
    userInf: DecodeTokenInfo
  ): Promise<boolean> {
    const now = new Date()
    // ドキュメントの更新情報(ユーザID、更新日、バージョンなど)
    const result = await this.collections.documents.updateOne(
      {
        _id: new ObjectId(lockDocumentInfo.documentId),
        version: lockDocumentInfo.version
      },
      {
        $set: {
          editLock: lockDocumentInfo.lock,
          updateDate: now,
          updateUserId: new ObjectId(userInf.userId)
        },
        $inc: {
          version: 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  async getIndexList(
    searchDocumentIndexInfo: SearchDocumentIndexInfo
  ): Promise<Array<DocumentIndexInfo>> {
    const indexes: Array<DocumentIndexInfo> = []

    await this.collections.nodes
      .aggregate<Node & { page: Page }>([
        {
          $match: {
            documentId: new ObjectId(searchDocumentIndexInfo.documentId)
          }
        },
        {
          $lookup: {
            from: 'pages',
            localField: '_id',
            foreignField: '_id',
            as: 'page'
          }
        },
        {
          $unwind: '$page'
        }
      ])
      .toArray()
      .then((nodePages) => {
        nodePages.forEach((nodePage) => {
          const page = nodePage.page
          const index: DocumentIndexInfo = {
            pageId: page._id?.toHexString() as string,
            title: page.pageTitle,
            body: page.searchData
          }
          indexes.push(index)
        })
      })

    return indexes
  }

  private async getGroupByDocumentId(
    documentId: string
  ): Promise<Group | null> {
    const groups: Array<Group> = []
    await this.collections.documents
      .aggregate<Document & { group: Group }>([
        {
          $match: { _id: new ObjectId(documentId) }
        },
        {
          $lookup: {
            from: 'groups',
            localField: 'groupId',
            foreignField: '_id',
            as: 'group'
          }
        },
        {
          $unwind: '$group'
        }
      ])
      .toArray()
      .then((documentGroups) => {
        documentGroups.forEach((documentGroup) => {
          groups.push(documentGroup.group)
        })
      })

    return groups.length ? groups[0] : null
  }
}

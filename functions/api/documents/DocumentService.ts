import { ObjectId } from 'mongodb'
import { Category, Collections, Document, Page, User } from '../db/DbService'
import { DecodeTokenInfo } from '../auth/DecodeTokenInfo'
import { DocumentInfo } from './model/DocumentInfo'
import { RegisterDocument } from './model/RegisterDocument'
import { UpdateDocumentCategoryInfo } from './model/UpdateDocumentCategoryInfo'
import { UpdateDocumentInfo } from './model/UpdateDocumentInfo'
import { UpdateDocumentAttribute } from './model/UpdateDocumentAttribute'
import { DocumentListInfo } from './model/DocumentListInfo'
const remark = require('remark')
const strip = require('strip-markdown')

/**
 * ドキュメントサービス
 */
export class DocumentService {
  constructor(private readonly collections: Collections) {}

  // ドキュメントリスト取得
  async getCategoryList(): Promise<Array<DocumentListInfo>> {
    const ducumentList: Array<DocumentListInfo> = []
    await this.collections.documents
      .aggregate<Document & { page: Page } & { category: Category }>([
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
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'category'
          }
        },
        {
          $unwind: '$category'
        },
        {
          $sort: {
            'page.updateDate': -1
          }
        }
      ])
      .toArray()
      .then((documentPageCategories) => {
        documentPageCategories.forEach((documentPageCategory) => {
          const page = documentPageCategory.page
          const category = documentPageCategory.category
          const documentListInfo: DocumentListInfo = {
            documentId: documentPageCategory._id?.toHexString() as string,
            pageTitle: page.pageTitle,
            editLock: documentPageCategory.editLock,
            archive: documentPageCategory.archive,
            categoryId: documentPageCategory.catetoryId.toHexString(),
            categoryName: category.name
          }
          ducumentList.push(documentListInfo)
        })
      })

    return ducumentList
  }

  // ドキュメント取得
  async getCategoryById(documentId: string): Promise<DocumentInfo | null> {
    const category = await this.getCategoryByDocumentId(documentId)
    if (!category) {
      throw new Error('カテゴリ未発見')
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
            localField: 'registerUserIs',
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
            categoryId: document.catetoryId.toHexString(),
            categoryName: category.name,
            pageRegisterDate: pageDocument.registerDate.toISOString(),
            pageRegisterUserId: registerUser._id?.toHexString() || '',
            pageUpdateDate: pageDocument.updateDate.toISOString(),
            pageUpdateUserId: updateUser._id?.toHexString() || '',
            pageVersion: pageDocument.version
          }
          documentInfos.push(documentInfo)
        })
      })

    if (documentInfos.length) {
      return null
    }

    return documentInfos[0]
  }

  // ドキュメント登録
  async registerDocument(
    registerDocumentInfo: RegisterDocument,
    userInf: DecodeTokenInfo
  ): Promise<string> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userInf.userId)
    })
    // FIXME userがnullの場合は？

    const oCategoryId = new ObjectId(registerDocumentInfo.categoryId || '0')
    // FIXME 存在しないカテゴリの場合は？
    const now = new Date()

    const documentResult = await this.collections.documents.insertOne({
      catetoryId: oCategoryId,
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

  // カテゴリ変更
  async updateDocumentCategory(
    updateDocumentCategoryInfo: UpdateDocumentCategoryInfo
  ): Promise<boolean> {
    const oCategoryId = new ObjectId(updateDocumentCategoryInfo.categoryId)
    const category = await this.collections.categories.findOne({
      _id: oCategoryId
    })
    if (!category) {
      throw new Error('カテゴリ未発見')
    }

    const result = await this.collections.documents.updateOne(
      {
        _id: new ObjectId(updateDocumentCategoryInfo.documentId),
        version: updateDocumentCategoryInfo.version
      },
      {
        $set: {
          catetoryId: oCategoryId
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // ドキュメント更新
  // TODO pageの更新に移動？
  async updateDocument(
    updateDocument: UpdateDocumentInfo,
    userInf: DecodeTokenInfo
  ): Promise<boolean> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userInf.userId)
    })
    // FIXME userがnullの場合は？
    const now = new Date()

    const result = await this.collections.pages.updateOne(
      {
        _id: new ObjectId(updateDocument.documentId),
        version: updateDocument.version
      },
      {
        $set: {
          pageTitle: updateDocument.pageTitle,
          pageData: updateDocument.pageData,
          searchData: createSearchData(updateDocument.pageData),
          updateDate: now,
          updateUserId: user?._id as ObjectId,
          version: updateDocument.version + 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // ドキュメント削除
  async deleteDocument(documentId: string): Promise<boolean> {
    const oDocumentId = new ObjectId(documentId)
    await this.collections.pages.deleteMany({
      documentId: oDocumentId
    })

    const result = await this.collections.documents.deleteOne({
      _id: oDocumentId
    })

    return result.deletedCount !== 1
  }

  // ドキュメントアーカイブ
  async archiveDocument(
    documentAttribute: UpdateDocumentAttribute,
    archive: boolean
  ): Promise<boolean> {
    const result = await this.collections.documents.updateOne(
      {
        _id: new ObjectId(documentAttribute.documentId),
        version: documentAttribute.version
      },
      {
        $set: {
          archive
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // ドキュメントロック
  async lockDocument(
    documentAttribute: UpdateDocumentAttribute,
    lock: boolean
  ): Promise<boolean> {
    const result = await this.collections.documents.updateOne(
      {
        _id: new ObjectId(documentAttribute.documentId),
        version: documentAttribute.version
      },
      {
        $set: {
          editLock: lock
        }
      }
    )

    return result.modifiedCount !== 1
  }

  private async getCategoryByDocumentId(
    documentId: string
  ): Promise<Category | null> {
    const categories: Array<Category> = []
    await this.collections.documents
      .aggregate<Document & { category: Category }>([
        {
          _id: new ObjectId(documentId)
        },
        {
          $lookup: {
            from: 'categories',
            localField: 'categoryId',
            foreignField: '_id',
            as: 'caetgory'
          }
        },
        {
          $unwind: '$category'
        }
      ])
      .toArray()
      .then((documentCategories) => {
        documentCategories.forEach((documentCategory) => {
          categories.push(documentCategory.category)
        })
      })

    return categories.length ? categories[0] : null
  }
}

function createSearchData(pageData: string): string {
  return remark().use(strip).processSync(pageData).toString()
}

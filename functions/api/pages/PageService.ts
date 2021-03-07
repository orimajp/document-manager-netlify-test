import { ObjectId } from 'mongodb'
import { Collections, Page, Document, User } from '../db/DbService'
import { DecodeTokenInfo } from '../auth/DecodeTokenInfo'
import { createSearchData } from '../shared/SearchDataCreator'
import { UpdatePageInfo } from './model/UpdatePageInfo'
import { PageInfo } from './model/PageInfo'
import { RegisterPageInfo } from './model/RegisterPageInfo'
import { DeletePageInfo } from './model/DeletePageInfo'
import { DeleteRecoverPageInfo } from './model/DeleteRecoverPageInfo'
import { RecoverPageInfo } from './model/RecoverPageInfo'

type DocumentPageAttribute = {
  lock: boolean
  archive: boolean
  delete: boolean
}

/**
 * ページサービス
 */
export class PageService {
  constructor(private readonly collections: Collections) {}

  // ページ取得
  async getPageById(pageId: string): Promise<PageInfo | null> {
    const pageInfos: Array<PageInfo> = []

    await this.collections.pages
      .aggregate<Page & { registerUser: User } & { updateUser: User }>([
        {
          $match: { pageId: new ObjectId(pageId) }
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
      .then((pageUsers) => {
        pageUsers.forEach((pageUser) => {
          const registerUser = pageUser.registerUser
          const updateUser = pageUser.updateUser
          const pageInfo: PageInfo = {
            pageId: pageUser._id?.toHexString() as string,
            documentId: pageUser.documentId.toHexString(),
            pageTitle: pageUser.pageTitle,
            pageData: pageUser.pageData,
            delete: pageUser.delete,
            pageRegisterDate: pageUser.registerDate.toISOString(),
            pageRegisterUserId: pageUser.registerUserId.toHexString(),
            pageRegisterUserName: registerUser.userName,
            pageUpdateDate: pageUser.updateDate.toISOString(),
            pageUpdateUserId: pageUser.updateUserId.toHexString(),
            pageUpdateUserName: updateUser.userName,
            pageVersion: pageUser.version
          }
          pageInfos.push(pageInfo)
        })
      })

    if (!pageInfos.length) {
      return null
    }

    return pageInfos[0]
  }

  // ページ登録
  async registerPage(
    registePage: RegisterPageInfo,
    userInfo: DecodeTokenInfo
  ): Promise<string> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userInfo.userId)
    })
    // FIXME userがnullの場合は？
    const now = new Date()

    const result = await this.collections.pages.insertOne({
      documentId: new ObjectId(registePage.documentId),
      pageTitle: registePage.pageTitle,
      pageData: registePage.pageData,
      searchData: createSearchData(registePage.pageData),
      // delete: false,
      delete: true, // 削除状態でいったん登録
      registerDate: now,
      registerUserId: user?._id as ObjectId,
      updateDate: now,
      updateUserId: user?._id as ObjectId,
      version: 0
    })

    return result.insertedId.toHexString()
  }

  // ページ更新
  async updatePage(
    updatePageInfo: UpdatePageInfo,
    userInfo: DecodeTokenInfo
  ): Promise<boolean> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userInfo.userId)
    })
    // FIXME userがnullの場合は？
    const now = new Date()

    const result = await this.collections.pages.updateOne(
      {
        _id: new ObjectId(updatePageInfo.pageId),
        version: updatePageInfo.version
      },
      {
        $set: {
          pageTitle: updatePageInfo.pageTitle,
          pageData: updatePageInfo.pageData,
          searchData: createSearchData(updatePageInfo.pageData),
          updateDate: now,
          updateUserId: user?._id as ObjectId
          // version: updateDocument.version + 1
        },
        $inc: {
          version: 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // ページ削除(論理)
  async deletePage(
    deletePageInfo: DeletePageInfo,
    userInfo: DecodeTokenInfo
  ): Promise<boolean> {
    // TODO ノードリンクからの削除が必要、ノードサービス側の動作か？
    // TODO 更新対象ノードの楽観ロックチェックも必要
    return await this.deleteRecoverPage(deletePageInfo, userInfo, true)
  }

  // ページ復旧
  async recoverPage(
    recoverPageInf: RecoverPageInfo,
    userInfo: DecodeTokenInfo
  ): Promise<boolean> {
    // TODO ドキュメントトップにリンクする必要がある
    return await this.deleteRecoverPage(recoverPageInf, userInfo, false)
  }

  // 属性取得
  async getAttribute(pageId: string): Promise<DocumentPageAttribute | null> {
    const attributes: Array<DocumentPageAttribute> = []

    await this.collections.pages
      .aggregate<Page & { document: Document }>([
        {
          $match: { _id: new ObjectId(pageId) }
        },
        {
          $lookup: {
            from: 'documents',
            localField: 'documentId',
            foreignField: '_id',
            as: 'docment'
          }
        },
        {
          $unwind: '$document'
        }
      ])
      .toArray()
      .then((documentPageAttributes) => {
        documentPageAttributes.forEach((documentPageAttribute) => {
          const attribute: DocumentPageAttribute = {
            lock: documentPageAttribute.document.editLock,
            archive: documentPageAttribute.document.archive,
            delete: documentPageAttribute.delete
          }
          attributes.push(attribute)
        })
      })

    if (!arguments.length) {
      return null
    }

    return attributes[0]
  }

  private async deleteRecoverPage(
    deleteRecoverPageInfo: DeleteRecoverPageInfo,
    userInfo: DecodeTokenInfo,
    deleteFlag: boolean
  ): Promise<boolean> {
    const user = await this.collections.users.findOne({
      _id: new ObjectId(userInfo.userId)
    })
    // FIXME userがnullの場合は？
    const now = new Date()

    const result = await this.collections.pages.updateOne(
      {
        _id: new ObjectId(deleteRecoverPageInfo.pageId),
        version: deleteRecoverPageInfo.version
      },
      {
        $set: {
          delete: deleteFlag,
          updateDate: now,
          updateUserId: user?._id as ObjectId
          // version: updateDocument.version + 1
        },
        $inc: {
          version: 1
        }
      }
    )

    return result.modifiedCount !== 1
  }
}

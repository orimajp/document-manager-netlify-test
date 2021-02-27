import { ObjectId } from 'mongodb'
import { Category, Collections } from '../db/DbService'
import { DecodeTokenInfo } from '../auth/DecodeTokenInfo'
import { CategoryInfo } from './model/CategoryInfo'
import { RegisterCategoryInfo } from './model/RegisterCategoryInfo'
import { CategoryListInfo } from './model/CategoryListInfo'
import { UpdateCategoryInfo } from './model/UpdateCategoryInfo'

/**
 * カテゴリサービス
 */
export class CategoryService {
  constructor(private readonly collections: Collections) {}

  // カテゴリリスト取得
  async getCategoryList(): Promise<Array<CategoryListInfo>> {
    const categoryListInfos: Array<CategoryListInfo> = []

    await this.collections.categories
      .aggregate<Category & { documentCount: number }>([
        {},
        {
          $lookup: {
            from: 'documents',
            localField: '_id',
            foreignField: 'categoryId',
            as: 'document'
          }
        },
        {
          $project: {
            _id: '$_id',
            name: '$name',
            documentCount: {
              $size: '$document'
            }
          }
        }
      ])
      .toArray()
      .then((categoryDocuments) => {
        categoryDocuments.forEach((categoryDocument) => {
          const categoryListInfo: CategoryListInfo = {
            categoryId: categoryDocument._id?.toHexString() as string,
            categoryName: categoryDocument.name,
            documentCount: categoryDocument.documentCount
          }
          categoryListInfos.push(categoryListInfo)
        })
      })

    return categoryListInfos
  }

  // カテゴリ情報取得
  async findCategoryById(categoryId: string): Promise<CategoryInfo | null> {
    const category = await this.collections.categories.findOne({
      _id: new ObjectId(categoryId)
    })

    if (!category) {
      return null
    }

    return {
      // @ts-ignore
      categoryId: category._id.toHexString(),
      categoryName: category.name,
      version: category.version
    }
  }

  // カテゴリ登録
  async registerCategory(
    registerCategoryInfo: RegisterCategoryInfo,
    userInf: DecodeTokenInfo
  ): Promise<CategoryInfo> {
    const now = new Date()
    const result = await this.collections.categories.insertOne({
      name: registerCategoryInfo.categoryName,
      registerDate: now,
      registerUserId: new ObjectId(userInf.userId),
      updateDate: now,
      updateUserId: new ObjectId(userInf.userId),
      version: 0
    })

    const category = await this.collections.categories.findOne({
      _id: result.insertedId
    })
    if (!category) {
      throw new Error('カテゴリの登録に失敗しました')
    }

    return {
      categoryId: result.insertedId.toHexString(),
      categoryName: category.name,
      version: category.version
    }
  }

  // カテゴリ名変更
  async updateCategory(
    updateCategoryInfo: UpdateCategoryInfo,
    userInf: DecodeTokenInfo
  ): Promise<boolean> {
    const now = new Date()
    const result = await this.collections.categories.updateOne(
      {
        _id: new ObjectId(updateCategoryInfo.categoryId),
        version: updateCategoryInfo.version
      },
      {
        $set: {
          categoryName: updateCategoryInfo.categoryName,
          registerUserId: new ObjectId(userInf.userId),
          registerDate: now,
          version: updateCategoryInfo.version + 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // カテゴリ削除 所属ドキュメントのチェックが必要
  async deleteCategory(categoryId: string): Promise<boolean> {
    const result = await this.collections.categories.deleteOne({
      _id: new ObjectId(categoryId)
    })

    return result.deletedCount !== 1
  }
}

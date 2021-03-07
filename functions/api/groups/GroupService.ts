import { ObjectId } from 'mongodb'
import { Group, Collections } from '../db/DbService'
import { DecodeTokenInfo } from '../auth/DecodeTokenInfo'
import { GroupInfo } from './model/GroupInfo'
import { RegisterGroupInfo } from './model/RegisterGroupInfo'
import { GroupListInfo } from './model/GroupListInfo'
import { UpdateGroupInfo } from './model/UpdateGroupInfo'

/**
 * グループサービス
 */
export class GroupService {
  constructor(private readonly collections: Collections) {}

  // グループリスト取得
  async getGroupList(): Promise<Array<GroupListInfo>> {
    const groupListInfos: Array<GroupListInfo> = []

    await this.collections.groups
      .aggregate<Group & { documentCount: number }>([
        {},
        {
          $lookup: {
            from: 'documents',
            localField: '_id',
            foreignField: 'groupId',
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
      .then((groupDocuments) => {
        groupDocuments.forEach((groupDocument) => {
          const groupListInfo: GroupListInfo = {
            groupId: groupDocument._id?.toHexString() as string,
            groupName: groupDocument.name,
            documentCount: groupDocument.documentCount
          }
          groupListInfos.push(groupListInfo)
        })
      })

    return groupListInfos
  }

  // グループ情報取得
  async getGroupById(groupId: string): Promise<GroupInfo | null> {
    const group = await this.collections.groups.findOne({
      _id: new ObjectId(groupId)
    })

    if (!group) {
      return null
    }

    return {
      groupId: group._id?.toHexString() as string,
      groupName: group.name,
      version: group.version
    }
  }

  // グループ登録
  async registerGroup(
    registerGroupInfo: RegisterGroupInfo,
    userInf: DecodeTokenInfo
  ): Promise<GroupInfo> {
    const now = new Date()
    const result = await this.collections.groups.insertOne({
      name: registerGroupInfo.groupName,
      registerDate: now,
      registerUserId: new ObjectId(userInf.userId),
      updateDate: now,
      updateUserId: new ObjectId(userInf.userId),
      version: 0
    })

    const group = await this.collections.groups.findOne({
      _id: result.insertedId
    })
    if (!group) {
      throw new Error('グループの登録に失敗しました')
    }

    return {
      groupId: result.insertedId.toHexString(),
      groupName: group.name,
      version: group.version
    }
  }

  // グループ名変更
  async updateGroup(
    updateGroupInfo: UpdateGroupInfo,
    userInf: DecodeTokenInfo
  ): Promise<boolean> {
    const now = new Date()
    const result = await this.collections.groups.updateOne(
      {
        _id: new ObjectId(updateGroupInfo.groupId),
        version: updateGroupInfo.version
      },
      {
        $set: {
          name: updateGroupInfo.groupName,
          registerUserId: new ObjectId(userInf.userId),
          registerDate: now
          // version: updateGroupInfo.version + 1
        },
        $inc: {
          version: 1
        }
      }
    )

    return result.modifiedCount !== 1
  }

  // グループ削除 所属ドキュメントのチェックが必要
  async deleteGroup(groupId: string): Promise<boolean> {
    const result = await this.collections.groups.deleteOne({
      _id: new ObjectId(groupId)
    })

    return result.deletedCount !== 1
  }
}

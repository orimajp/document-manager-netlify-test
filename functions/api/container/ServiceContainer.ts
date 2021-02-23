import { connectDb } from '../db/DbService'
import { UserService } from '../users/UserService'
import { AuthService } from '../auth/AuthService'

export class ServiceContainer {
  constructor(
    public readonly userService: UserService,
    public readonly authService: AuthService
  ) {}
}

let container: ServiceContainer | null = null

export async function createContainer(): Promise<ServiceContainer> {
  if (container) {
    return container
  }

  const collections = await connectDb()
  container = new ServiceContainer(
    new UserService(collections),
    new AuthService(collections)
  )

  return container
}

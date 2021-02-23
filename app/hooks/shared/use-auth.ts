// import { NuxtAxiosInstance } from '@nuxtjs/axios'
import { Auth } from '@nuxtjs/auth-next'
import { useContext } from '@nuxtjs/composition-api'

// https://polidog.jp/2020/11/01/nuxt-microcms/
declare module '@nuxt/types' {
  interface Context {
    // $axios: NuxtAxiosInstance
    $auth: Auth
  }
}

export interface AuthUser {
  userId: string
  userName: string
  email: string
}

export const useAuth = () => {
  const { $auth } = useContext()

  const login = async (email: string, password: string) => {
    await $auth.loginWith('local', {
      data: {
        email,
        password
      }
    })
  }

  const logout = async () => {
    await $auth.logout()
  }

  const loggedIn = () => {
    return $auth.loggedIn
  }

  /*
  const user = (): AuthUser => {
    return $auth.user as AuthUser
  }
   */
  const user = () => {
    return $auth.user
  }

  return {
    login,
    logout,
    loggedIn,
    user
  }
}

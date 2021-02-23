<template>
  <div>
    <v-app-bar app>
      <v-toolbar-title>テスト</v-toolbar-title>
      <v-spacer />
      <v-btn v-if="loginState" class="success" @click="logout"
        >ログアウト</v-btn
      >
      <v-btn v-else class="primary" @click="gotoLogin">ログイン</v-btn>
    </v-app-bar>
    <v-main>
      <v-container>
        <v-card>
          <v-card-text>
            <h1 v-if="loginState">こんにちは{{ userName }}さん</h1>
            <h1 v-else>開発中</h1>
          </v-card-text>
        </v-card>
      </v-container>
    </v-main>
  </div>
</template>

<script lang="ts">
import { defineComponent, computed, useRouter } from '@nuxtjs/composition-api'
import { useAuth } from '~/hooks/shared/use-auth'
export default defineComponent({
  setup() {
    const { user, loggedIn, logout } = useAuth()
    const userInfo = computed(() => user())
    const loginState = computed(() => loggedIn())
    const userName = computed(() => userInfo.value?.userName)
    const router = useRouter()
    const gotoLogin = () => {
      router.push('/login')
    }
    return {
      gotoLogin,
      logout,
      userInfo,
      userName,
      loginState
    }
  }
})
</script>

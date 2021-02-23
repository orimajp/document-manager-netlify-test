<template>
  <v-main>
    <v-container>
      <v-card max-width="400" class="mx-auto">
        <v-card-text>
          <v-alert v-if="loginFail" dense type="error">ログインエラー</v-alert>
          <v-form>
            <v-text-field
              v-model="email"
              :rules="[required]"
              label="メールアドレス"
            />
            <v-text-field
              v-model="password"
              :rules="[required]"
              type="password"
              label="パスワード"
            />
          </v-form>
        </v-card-text>
        <v-card-actions>
          <v-btn class="primary" block :disabled="!filled" @click="execLogin"
            >ログイン</v-btn
          >
        </v-card-actions>
      </v-card>
    </v-container>
  </v-main>
</template>

<script lang="ts">
import { defineComponent } from '@nuxtjs/composition-api'
import { useLogin } from '~/hooks/page/auth/use-login'
export default defineComponent({
  layout: 'login',
  setup() {
    const {
      execLogin,
      required,
      email,
      password,
      filled,
      loginFail
    } = useLogin()

    return {
      required,
      execLogin,
      email,
      password,
      filled,
      loginFail
    }
  }
})
</script>

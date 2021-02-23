import { computed, reactive, toRefs, ref } from '@nuxtjs/composition-api'
import { useAuth } from '~/hooks/shared/use-auth'

interface LoginInfo {
  email: string
  password: string
}

export const useLogin = () => {
  const loginInfo = reactive<LoginInfo>({
    email: '',
    password: ''
  })

  const loginFail = ref(false)

  const { login } = useAuth()
  const execLogin = async () => {
    loginFail.value = false
    try {
      await login(loginInfo.email, loginInfo.password)
    } catch (e) {
      console.log(e)
      loginFail.value = true
    }
  }

  const filled = computed(
    () => loginInfo.email !== '' && loginInfo.password !== ''
  )

  const required = (value: string) => {
    return !!value || '必須項目です'
  }

  return {
    ...toRefs(loginInfo),
    required,
    execLogin,
    loginFail,
    filled
  }
}

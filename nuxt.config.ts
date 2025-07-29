// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@pinia/nuxt'],
  // typescript: {
  //   strict: false,
  //   typeCheck: false  // 在构建时禁用类型检查以提高速度
  // },
  // vite: {
  //   build: {
  //     minify: 'esbuild',  // 使用更快的 esbuild 压缩
  //     target: 'node18'
  //   }
  // }
})

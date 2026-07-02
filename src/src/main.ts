import { createApp } from 'vue'
import { createPinia } from 'pinia'
import PrimeVue from 'primevue/config'
import Aura from '@primeuix/themes/aura'
import ToastService from 'primevue/toastservice'
import Tooltip from 'primevue/tooltip'

import 'primeicons/primeicons.css'
import 'highlight.js/styles/github.css'
import '@/styles/panel.css'

import hljs from 'highlight.js/lib/core'
import http from 'highlight.js/lib/languages/http'
import json from 'highlight.js/lib/languages/json'
import xml from 'highlight.js/lib/languages/xml'

import App from './App.vue'
import { initDebugModeListener } from '@/utils/debug-logger'

// 初始化调试模式状态监听（确保 panel 能响应 popup 中的调试模式切换）
initDebugModeListener()

hljs.registerLanguage('http', http)
hljs.registerLanguage('json', json)
hljs.registerLanguage('xml', xml)

const app = createApp(App)
app.use(createPinia())
app.use(PrimeVue, {
    theme: {
        preset: Aura,
        options: {
            darkModeSelector: '@media (prefers-color-scheme: dark)'
        }
    },
    pt: {
        toast: {
            closeButton: {
                autofocus: false
            }
        },
        dialog: {
            pcCloseButton: {
                root: { autofocus: false }
            },
            pcMaximizeButton: {
                root: { autofocus: false }
            }
        }
    }
})
app.use(ToastService)
app.directive('tooltip', Tooltip)
app.mount('#app')

import type { ModalFuncProps } from 'antd'

type FeedbackApi = {
  warning: (content: string) => void
  error: (content: string) => void
  notifyWarning: (message: string, description: string) => void
  confirm: (config: ModalFuncProps) => unknown
}

let feedbackApi: FeedbackApi = {
  warning: () => undefined,
  error: () => undefined,
  notifyWarning: () => undefined,
  confirm: () => undefined,
}

export function setFeedbackApi(api: FeedbackApi) {
  feedbackApi = api
}

export function showWarning(content: string) {
  feedbackApi.warning(content)
}

export function showError(content: string) {
  feedbackApi.error(content)
}

export function showNotificationWarning(message: string, description: string) {
  feedbackApi.notifyWarning(message, description)
}

export function showConfirm(config: ModalFuncProps) {
  return feedbackApi.confirm(config)
}

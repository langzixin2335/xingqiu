/**
 * 推送暂未接入 FCM/华为通道。
 * 在无 google-services.json 的真机上调用 PushNotifications.register() 可能导致原生闪退，
 * 因此这里保持空实现，避免拖垮 App。
 */

export async function initPushNotifications() {
  return
}

export async function unregisterPushNotifications() {
  return
}

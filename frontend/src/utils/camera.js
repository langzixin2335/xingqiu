import { Capacitor } from '@capacitor/core'
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera'

export function isNativeApp() {
  return Capacitor.isNativePlatform()
}

export async function takeTaskPhoto() {
  return pickImage(CameraSource.Prompt)
}

async function ensureCameraPermission(source) {
  const needPhotos = source === 'photos' || source === 'prompt'
  const needCamera = source === 'camera' || source === 'prompt'
  let perm = await Camera.checkPermissions()
  if (
    (needCamera && perm.camera !== 'granted') ||
    (needPhotos && perm.photos !== 'granted' && perm.photos !== 'limited')
  ) {
    perm = await Camera.requestPermissions({
      permissions: needCamera && needPhotos ? ['camera', 'photos'] : needCamera ? ['camera'] : ['photos'],
    })
  }
  if (needCamera && perm.camera !== 'granted') {
    throw new Error('未授予相机权限，请在系统设置中开启')
  }
  if (needPhotos && perm.photos !== 'granted' && perm.photos !== 'limited') {
    throw new Error('未授予相册权限，请在系统设置中开启')
  }
}

/** @param {'camera' | 'photos' | 'prompt'} source */
export async function pickImage(source = 'prompt') {
  if (!isNativeApp()) return null

  await ensureCameraPermission(source)

  const sourceMap = {
    camera: CameraSource.Camera,
    photos: CameraSource.Photos,
    prompt: CameraSource.Prompt,
  }

  const photo = await Camera.getPhoto({
    quality: 90,
    allowEditing: false,
    resultType: CameraResultType.Uri,
    source: sourceMap[source] || CameraSource.Prompt,
    promptLabelHeader: '选择图片来源',
    promptLabelPhoto: '从相册选择',
    promptLabelPicture: '拍照',
    promptLabelCancel: '取消',
  })
  return photo.webPath || photo.path || null
}

export async function webPathToFile(webPath, filename = 'scan.jpg') {
  const res = await fetch(webPath)
  const blob = await res.blob()
  const type = blob.type || 'image/jpeg'
  const ext = type.includes('png') ? 'png' : type.includes('webp') ? 'webp' : 'jpg'
  const name = filename.includes('.') ? filename : `${filename}.${ext}`
  return new File([blob], name, { type })
}

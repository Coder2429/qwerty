import axios from 'axios'
import FormData from 'form-data'
import logger from './logger.js'

const VK_API_VERSION = '5.131'
const VK_API_URL = 'https://api.vk.com/method'

// Получаем токен из переменных окружения
const getAccessToken = () => {
  const token = process.env.VK_ACCESS_TOKEN
  if (!token) {
    throw new Error('VK_ACCESS_TOKEN не установлен в .env')
  }
  return token
}

/**
 * Загружает фото на сервер VK
 * @param {Buffer} photoBuffer - Буфер изображения
 * @param {string} filename - Имя файла
 * @returns {Promise<Object>} - Объект с данными фото (id, owner_id и т.д.)
 */
export async function uploadPhoto(photoBuffer, filename) {
  try {
    const token = getAccessToken()

    // 1. Получаем URL для загрузки
    const uploadServerResponse = await axios.get(`${VK_API_URL}/photos.getWallUploadServer`, {
      params: {
        access_token: token,
        v: VK_API_VERSION
      }
    })

    if (uploadServerResponse.data.error) {
      throw new Error(uploadServerResponse.data.error.error_msg)
    }

    const uploadUrl = uploadServerResponse.data.response.upload_url

    // 2. Загружаем фото на сервер VK
    const formData = new FormData()
    formData.append('photo', photoBuffer, {
      filename: filename || 'photo.jpg',
      contentType: 'image/jpeg'
    })

    const uploadResponse = await axios.post(uploadUrl, formData, {
      headers: formData.getHeaders()
    })

    const { server, photo, hash } = uploadResponse.data

    // 3. Сохраняем фото
    const saveResponse = await axios.get(`${VK_API_URL}/photos.saveWallPhoto`, {
      params: {
        access_token: token,
        server: server,
        photo: photo,
        hash: hash,
        v: VK_API_VERSION
      }
    })

    if (saveResponse.data.error) {
      throw new Error(saveResponse.data.error.error_msg)
    }

    const photoData = saveResponse.data.response[0]
    logger.info('Photo uploaded successfully', { 
      photoId: photoData.id, 
      ownerId: photoData.owner_id 
    })
    return photoData
  } catch (error) {
    logger.error('Upload photo error', { 
      error: error.message,
      response: error.response?.data 
    })
    throw new Error(`Ошибка загрузки фото: ${error.message}`)
  }
}

/**
 * Публикует пост на стене группы
 * @param {Object} postData - Данные поста
 * @param {string} postData.text - Текст поста
 * @param {number} postData.group_id - ID группы (положительное число)
 * @param {Array<Object>} postData.photos - Массив объектов фото от uploadPhoto
 * @returns {Promise<Object>} - Результат публикации
 */
export async function publishPost(postData) {
  try {
    const { text, group_id, photos = [] } = postData
    const token = getAccessToken()

    if (!text || !group_id) {
      throw new Error('Отсутствуют обязательные поля: text, group_id')
    }

    // Формируем attachments (вложения)
    const attachments = photos
      .map(photo => `photo${photo.owner_id}_${photo.id}`)
      .join(',')

    // Публикуем пост
    const response = await axios.get(`${VK_API_URL}/wall.post`, {
      params: {
        access_token: token,
        owner_id: -Math.abs(group_id), // Отрицательный ID для группы
        from_group: 1, // От имени сообщества
        message: text,
        attachments: attachments || undefined,
        v: VK_API_VERSION
      }
    })

    if (response.data.error) {
      throw new Error(response.data.error.error_msg)
    }

    const postId = response.data.response.post_id
    logger.info('Post published successfully', { 
      postId, 
      groupId: group_id,
      hasPhotos: photos.length > 0 
    })
    
    return {
      post_id: postId,
      success: true
    }
  } catch (error) {
    logger.error('Publish post error', { 
      error: error.message,
      groupId: group_id,
      response: error.response?.data 
    })
    throw new Error(`Ошибка публикации поста: ${error.message}`)
  }
}

/**
 * Полная функция: загружает фото и публикует пост
 * @param {Object} data - Данные поста
 * @param {string} data.text - Текст поста
 * @param {number} data.group_id - ID группы
 * @param {Array<Buffer>} data.photoBuffers - Массив буферов изображений
 * @returns {Promise<Object>} - Результат публикации
 */
export async function uploadPhotosAndPublish(data) {
  const { text, group_id, photoBuffers = [] } = data

  try {
    // Загружаем все фото параллельно
    const uploadPromises = photoBuffers.map((buffer, index) =>
      uploadPhoto(buffer, `photo_${index + 1}.jpg`)
    )

    const photos = await Promise.all(uploadPromises)

    // Публикуем пост с фото
    return await publishPost({
      text,
      group_id,
      photos
    })
  } catch (error) {
    console.error('Upload and publish error:', error)
    throw error
  }
}


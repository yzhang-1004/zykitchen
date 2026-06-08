/**
 * 压缩图片并转base64
 * @param {string} filePath 本地文件路径
 * @param {number} quality 压缩质量（默认60）
 * @returns {Promise<string>} base64字符串（含data URI前缀）
 */
function compressImageToBase64(filePath, quality = 60) {
  return new Promise((resolve, reject) => {
    wx.compressImage({
      src: filePath,
      quality: quality,
      success: (res) => {
        const fs = wx.getFileSystemManager();
        try {
          const base64 = fs.readFileSync(res.tempFilePath, 'base64');
          const dataURI = `data:image/jpeg;base64,${base64}`;
          console.log('图片压缩完成，大小约:', Math.round(base64.length * 0.75 / 1024), 'KB');
          resolve(dataURI);
        } catch (err) {
          console.error('读取base64失败:', err);
          reject(err);
        }
      },
      fail: (err) => {
        console.error('压缩图片失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 处理图片（本地图片压缩转base64，已有路径直接保留）
 * @param {string} filePath 图片路径
 * @returns {Promise<string>} base64字符串或原路径
 */
async function processImage(filePath) {
  if (filePath.startsWith('data:')) {
    // 已经是base64，直接保留
    return filePath;
  } else if (filePath.startsWith('cloud://')) {
    // 云存储路径，已无法跨设备访问，丢弃
    console.warn('丢弃旧云存储图片:', filePath);
    return null;
  } else if (filePath.startsWith('http')) {
    // 临时URL，保留
    return filePath;
  } else {
    // 本地图片，压缩并转base64
    return await compressImageToBase64(filePath);
  }
}

/**
 * 批量处理图片
 * @param {Array} filePaths 图片路径数组
 * @returns {Promise<Array>} 处理后的图片数组
 */
async function uploadImages(filePaths) {
  const results = [];
  for (const path of filePaths) {
    try {
      const processed = await processImage(path);
      if (processed) {
        results.push(processed);
      }
    } catch (err) {
      console.error('图片处理失败:', path, err);
    }
  }
  return results;
}

/**
 * 处理单张图片（兼容旧接口）
 * @param {string} filePath 图片路径
 * @param {string} folder 文件夹名称（已忽略）
 * @returns {Promise<string>} base64字符串或原路径
 */
async function uploadImage(filePath, folder = 'dish') {
  return await processImage(filePath);
}

/**
 * 删除图片（base64不需要删除，仅兼容旧接口）
 * @param {string} fileID 文件ID或base64
 */
async function deleteImage(fileID) {
  // base64字符串不需要删除
  // 如果是云存储路径，尝试删除（可能会失败，忽略错误）
  if (fileID && fileID.startsWith('cloud://')) {
    try {
      await wx.cloud.deleteFile({
        fileList: [fileID]
      });
      console.log('删除云存储文件成功:', fileID);
    } catch (err) {
      console.warn('删除云存储文件失败（可忽略）:', err);
    }
  }
}

module.exports = {
  uploadImage,
  uploadImages,
  deleteImage,
  processImage,
  compressImageToBase64
};

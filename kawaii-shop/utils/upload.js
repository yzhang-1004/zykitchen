/**
 * 上传图片到云存储
 * @param {string} filePath 本地文件路径
 * @param {string} folder 文件夹名称（dish/recipe）
 * @returns {Promise} 云存储文件ID
 */
async function uploadImage(filePath, folder = 'dish') {
  try {
    const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`;
    const cloudPath = `${folder}/${fileName}`;
    
    const result = await wx.cloud.uploadFile({
      cloudPath: cloudPath,
      filePath: filePath
    });
    
    console.log('上传成功:', result.fileID);
    return result.fileID;
  } catch (err) {
    console.error('上传失败:', err);
    throw err;
  }
}

/**
 * 批量上传图片
 * @param {Array} filePaths 本地文件路径数组
 * @param {string} folder 文件夹名称
 * @returns {Promise<Array>} 云存储文件ID数组
 */
async function uploadImages(filePaths, folder = 'dish') {
  const uploadPromises = filePaths.map(path => uploadImage(path, folder));
  return Promise.all(uploadPromises);
}

/**
 * 删除云存储文件
 * @param {string} fileID 文件ID
 */
async function deleteImage(fileID) {
  try {
    await wx.cloud.deleteFile({
      fileList: [fileID]
    });
    console.log('删除成功:', fileID);
  } catch (err) {
    console.error('删除失败:', err);
    throw err;
  }
}

module.exports = {
  uploadImage,
  uploadImages,
  deleteImage
};

/**
 * 压缩图片并转base64
 * @param {string} filePath 本地文件路径
 * @param {number} quality 压缩质量（默认60）
 * @returns {Promise<string>} base64字符串（含data URI前缀）
 */
function compressImageToBase64(filePath, quality = 25) {
  return new Promise((resolve, reject) => {
    // 先获取图片信息，判断是否需要缩小
    wx.getImageInfo({
      src: filePath,
      success: (info) => {
        const maxWidth = 300;
        const needResize = info.width > maxWidth;
        let compressedWidth = info.width;
        let compressedHeight = info.height;
        
        // 如果宽度超过300px，按比例缩小
        if (needResize) {
          compressedWidth = maxWidth;
          compressedHeight = Math.round(info.height * maxWidth / info.width);
        }
        
        console.log('图片原始尺寸:', info.width, 'x', info.height, '需要缩放:', needResize);
        
        // 不需要缩放时只传quality，避免传入compressedWidth导致异常
        const compressOptions = needResize ? {
          src: filePath,
          quality: quality,
          compressedWidth: compressedWidth,
          compressHeight: compressedHeight
        } : {
          src: filePath,
          quality: quality
        };
        
        wx.compressImage({
          ...compressOptions,
          success: (res) => {
            const fs = wx.getFileSystemManager();
            try {
              const base64 = fs.readFileSync(res.tempFilePath, 'base64');
              const dataURI = `data:image/jpeg;base64,${base64}`;
              const sizeKB = Math.round(base64.length * 0.75 / 1024);
              console.log('图片压缩完成，大小约:', sizeKB, 'KB');
              resolve(dataURI);
            } catch (err) {
              console.error('读取base64失败，用原图:', err);
              // 失败时用原图
              const origBase64 = fs.readFileSync(filePath, 'base64');
              resolve(`data:image/jpeg;base64,${origBase64}`);
            }
          },
          fail: (err) => {
            console.error('压缩图片失败，用原图:', err);
            // 压缩失败时用原图转base64
            try {
              const fs = wx.getFileSystemManager();
              const origBase64 = fs.readFileSync(filePath, 'base64');
              resolve(`data:image/jpeg;base64,${origBase64}`);
            } catch (err2) {
              reject(err2);
            }
          }
        });
      },
      fail: (err) => {
        console.error('获取图片信息失败:', err);
        reject(err);
      }
    });
  });
}

/**
 * 压缩已有的base64图片（先写入临时文件再压缩）
 * @param {string} dataURI base64 data URI
 * @returns {Promise<string>} 压缩后的base64
 */
async function compressBase64Image(dataURI) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager();
    const tempPath = `${wx.env.USER_DATA_PATH}/temp_compress_${Date.now()}.jpg`;
    
    // 去掉data URI前缀，提取纯base64
    const base64Data = dataURI.replace(/^data:image\/\w+;base64,/, '');
    const originalSize = Math.round(base64Data.length * 0.75 / 1024);
    
    try {
      fs.writeFileSync(tempPath, base64Data, 'base64');
      
      wx.getImageInfo({
        src: tempPath,
        success: (info) => {
          const maxWidth = 300;
          let w = info.width;
          let h = info.height;
          if (w > maxWidth) {
            h = Math.round(h * maxWidth / w);
            w = maxWidth;
          }
          
          wx.compressImage({
            src: tempPath,
            quality: 25,
            compressedWidth: w,
            compressHeight: h,
            success: (res) => {
              try {
                const newBase64 = fs.readFileSync(res.tempFilePath, 'base64');
                const newSize = Math.round(newBase64.length * 0.75 / 1024);
                console.log('重新压缩完成，大小约:', newSize, 'KB，原始:', originalSize, 'KB');
                fs.unlink(tempPath).catch(() => {});
                
                // 如果压缩后比原来更大，用原来的
                if (newSize >= originalSize) {
                  console.warn('压缩后反而更大，使用原图');
                  resolve(dataURI);
                } else {
                  resolve(`data:image/jpeg;base64,${newBase64}`);
                }
              } catch (err) {
                reject(err);
              }
            },
            fail: reject
          });
        },
        fail: reject
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * 处理图片（本地图片压缩转base64，已有路径直接保留）
 * @param {string} filePath 图片路径
 * @returns {Promise<string>} base64字符串或原路径
 */
async function processImage(filePath) {
  if (filePath.startsWith('data:')) {
    // 已经是base64，检查大小，超过200KB则重新压缩
    const base64Size = Math.round(filePath.length * 0.75 / 1024);
    if (base64Size > 200) {
      console.warn('已有base64图片过大:', base64Size, 'KB，重新压缩');
      wx.showToast({ title: `图片较大(${base64Size}KB)，正在压缩...`, icon: 'none', duration: 1500 });
      const result = await compressBase64Image(filePath);
      const newSize = Math.round(result.length * 0.75 / 1024);
      wx.showToast({ title: `压缩完成(${newSize}KB)`, icon: 'success', duration: 1000 });
      return result;
    }
    return filePath;
  } else if (filePath.startsWith('cloud://')) {
    // 云存储路径，已无法跨设备访问，丢弃
    console.warn('丢弃旧云存储图片:', filePath);
    wx.showToast({ title: '已移除旧图片', icon: 'none', duration: 1000 });
    return null;
  } else if (filePath.startsWith('http://tmp') || filePath.startsWith('wxfile://')) {
    // 本地临时文件路径，压缩并转base64
    return await compressImageToBase64(filePath);
  } else if (filePath.startsWith('http')) {
    // 网络URL，保留
    return filePath;
  } else {
    // 其他本地图片，压缩并转base64
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
      wx.showToast({ title: '图片处理失败，已跳过', icon: 'none', duration: 1500 });
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
  compressImageToBase64,
  compressBase64Image
};

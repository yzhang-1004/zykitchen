/**
 * 云数据库操作工具类
 */
class DB {
  constructor() {
    this.db = wx.cloud.database();
    this._ = this.db.command;
  }

  /**
   * 获取集合引用
   * @param {string} name 集合名称
   */
  collection(name) {
    return this.db.collection(name);
  }

  /**
   * 添加文档
   * @param {string} collection 集合名称
   * @param {object} data 数据
   */
  async add(collection, data) {
    try {
      const now = new Date().toISOString();
      const fullData = {
        ...data,
        createTime: now,
        updateTime: now
      };
      
      // 计算数据大小
      const dataSize = JSON.stringify(fullData).length;
      console.log(`添加文档到 ${collection}，数据大小约:`, Math.round(dataSize / 1024), 'KB');
      
      const result = await this.collection(collection).add({
        data: fullData
      });
      return { success: true, data: result };
    } catch (err) {
      console.error('添加文档失败:', err);
      return { success: false, error: err };
    }
  }

  /**
   * 查询文档
   * @param {string} collection 集合名称
   * @param {object} where 查询条件
   * @param {number} limit 限制数量
   * @param {object} fields 字段过滤（可选，如 {images: false}）
   */
  async get(collection, where = {}, limit = 100, fields = null) {
    try {
      let query = this.collection(collection).where(where).limit(limit).orderBy('createTime', 'desc');
      if (fields) query = query.field(fields);
      const result = await query.get();
      return { success: true, data: result.data };
    } catch (err) {
      console.error('查询文档失败:', err);
      return { success: false, error: err };
    }
  }

  /**
   * 更新文档
   * @param {string} collection 集合名称
   * @param {string} id 文档ID
   * @param {object} data 更新的数据
   */
  async update(collection, id, data) {
    try {
      const result = await this.collection(collection).doc(id).update({
        data: {
          ...data,
          updateTime: new Date().toISOString()
        }
      });
      return { success: true, data: result };
    } catch (err) {
      console.error('更新文档失败:', err);
      return { success: false, error: err };
    }
  }

  /**
   * 删除文档
   * @param {string} collection 集合名称
   * @param {string} id 文档ID
   */
  async remove(collection, id) {
    try {
      const result = await this.collection(collection).doc(id).remove();
      return { success: true, data: result };
    } catch (err) {
      console.error('删除文档失败:', err);
      return { success: false, error: err };
    }
  }

  /**
   * 获取当前用户的openid（不依赖云函数）
   */
  async getOpenid() {
    if (this._openid) return this._openid;
    
    try {
      const cached = wx.getStorageSync('my_openid');
      if (cached) {
        this._openid = cached;
        return cached;
      }
    } catch (e) {}
    
    try {
      const db = wx.cloud.database();
      const res = await db.collection('temp_openid').add({ data: { t: Date.now() } });
      const doc = await db.collection('temp_openid').doc(res._id).get();
      this._openid = doc.data._openid;
      wx.setStorageSync('my_openid', this._openid);
      db.collection('temp_openid').doc(res._id).remove().catch(() => {});
      return this._openid;
    } catch (err) {
      console.error('获取openid失败:', err);
      return null;
    }
  }

  /**
   * 保存菜品图片到 dish_images 集合
   * @param {string} dishId 菜品文档ID
   * @param {Array} images 菜品图片 base64 数组
   * @param {Array} recipeImages 菜谱图片 base64 数组
   */
  async saveDishImages(dishId, images = [], recipeImages = []) {
    try {
      // 先删除该菜品的旧图片
      await this.deleteDishImages(dishId);
      
      // 添加新的菜品图
      for (let i = 0; i < images.length; i++) {
        await this.add('dish_images', {
          dishId, type: 'dish', index: i, base64: images[i]
        });
      }
      
      // 添加新的菜谱图
      for (let i = 0; i < recipeImages.length; i++) {
        await this.add('dish_images', {
          dishId, type: 'recipe', index: i, base64: recipeImages[i]
        });
      }
      
      console.log(`图片保存完成: ${images.length}张菜品图, ${recipeImages.length}张菜谱图`);
      return { success: true };
    } catch (err) {
      console.error('保存菜品图片失败:', err);
      return { success: false, error: err };
    }
  }

  /**
   * 查询菜品图片
   * @param {string} dishId 菜品文档ID
   * @param {string} type 图片类型 'dish'|'recipe'|不传=全部
   * @returns {Promise<{dish: Array, recipe: Array}>}
   */
  async getDishImages(dishId, type) {
    try {
      const where = { dishId };
      if (type) where.type = type;
      const result = await this.get('dish_images', where, 20);
      
      if (!result.success) {
        return type ? [] : { dish: [], recipe: [] };
      }
      
      const sorted = result.data.sort((a, b) => a.index - b.index);
      
      if (type) {
        // 查询指定类型
        return sorted.map(d => d.base64);
      } else {
        // 查询全部，分类返回
        return {
          dish: sorted.filter(d => d.type === 'dish').map(d => d.base64),
          recipe: sorted.filter(d => d.type === 'recipe').map(d => d.base64)
        };
      }
    } catch (err) {
      console.error('查询菜品图片失败:', err);
      return type ? [] : { dish: [], recipe: [] };
    }
  }

  /**
   * 将大 base64 字符串写入临时文件，返回文件路径（解决微信 image 组件无法渲染大 base64 的问题）
   * @param {string} base64 base64 字符串（可含或不含 data:...;base64, 前缀）
   * @returns {Promise<string>} 临时文件路径
   */
  async base64ToTempFile(base64) {
    const filePath = `${wx.env.USER_DATA_PATH}/dish_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.jpg`;
    let b64Data = base64;
    if (base64.startsWith('data:')) {
      b64Data = base64.split(',')[1];
    }
    const fs = wx.getFileSystemManager();
    fs.writeFileSync(filePath, b64Data, 'base64');
    return filePath;
  }

  /**
   * 删除菜品的所有图片
   * @param {string} dishId 菜品文档ID
   */
  async deleteDishImages(dishId) {
    try {
      const result = await this.get('dish_images', { dishId }, 100);
      for (const doc of result.data) {
        await this.remove('dish_images', doc._id);
      }
      return { success: true };
    } catch (err) {
      console.error('删除菜品图片失败:', err);
      return { success: false, error: err };
    }
  }

  /**
   * 重新压缩 dish_images 中的图片（解决旧图片太大无法渲染的问题）
   * @param {function} compressFn 压缩函数
   * @param {function} onProgress 进度回调
   */
  async recompressAllDishImages(compressFn, onProgress) {
    let skip = 0;
    let recompressed = 0;

    while (true) {
      let doc;
      try {
        const result = await this.collection('dish_images').skip(skip).limit(1).get();
        if (!result.data || result.data.length === 0) break;
        doc = result.data[0];
      } catch (err) {
        console.error('读取图片文档失败:', err);
        break;
      }

      const base64 = doc.base64 || '';
      // 只处理大于 50KB 的图片（约66000字符）
      if (base64.length > 66000) {
        if (onProgress) onProgress(doc.dishId, doc.type, 'compressing');
        try {
          const compressed = await compressFn(base64);
          if (compressed && compressed.length < base64.length) {
            await this.collection('dish_images').doc(doc._id).update({
              data: { base64: compressed }
            });
            recompressed++;
            console.log(`[压缩] 图片已压缩: ${Math.round(base64.length/1024)}KB -> ${Math.round(compressed.length/1024)}KB`);
          }
        } catch (err) {
          console.error('压缩图片失败:', err);
        }
      }

      skip++;
    }

    console.log(`重新压缩完成: 共处理 ${skip} 张图片，压缩 ${recompressed} 张`);
    return { total: skip, recompressed };
  }

  /**
   * 迁移旧数据：将 dishes 中内嵌的 base64 图片迁移到 dish_images 集合
   * 逐条处理，避免触发 1MB 查询限制
   * @param {function} onProgress 进度回调 (current, total, name)
   * @param {function} compressFn 压缩函数（可选，参数为base64，返回压缩后的base64）
   */
  async migrateAllDishes(onProgress, compressFn) {
    let skip = 0;
    let migrated = 0;
    let total = 0;

    while (true) {
      let doc;
      try {
        const result = await this.collection('dishes').skip(skip).limit(1).get();
        if (!result.data || result.data.length === 0) break;
        doc = result.data[0];
        total++;
      } catch (err) {
        console.error('读取菜品失败，跳过:', err);
        skip++;
        continue;
      }

      const images = doc.images || [];
      const recipeImages = doc.recipeImages || [];
      const hasOldImages = images.length > 0 || recipeImages.length > 0;

      if (hasOldImages) {
        if (onProgress) onProgress(total, doc.name, 'migrating');

        // 第1步：压缩图片（旧图片可能太大）
        let compressedImages = images;
        let compressedRecipeImages = recipeImages;
        if (compressFn) {
          compressedImages = [];
          for (const b64 of images) {
            try {
              const compressed = await compressFn(b64);
              compressedImages.push(compressed || b64); // 压缩失败用原图
            } catch (e) {
              compressedImages.push(b64);
            }
          }
          compressedRecipeImages = [];
          for (const b64 of recipeImages) {
            try {
              const compressed = await compressFn(b64);
              compressedRecipeImages.push(compressed || b64);
            } catch (e) {
              compressedRecipeImages.push(b64);
            }
          }
        }

        // 第2步：保存压缩后的图片到 dish_images
        try {
          await this.saveDishImages(doc._id, compressedImages, compressedRecipeImages);
          console.log(`[迁移] 图片保存成功: ${doc.name} (压缩后)`);
        } catch (err) {
          console.error(`[迁移] 图片保存失败: ${doc.name}`, err);
          if (onProgress) onProgress(total, doc.name, 'error');
          skip++;
          continue;
        }

        // 第3步：更新原文档
        try {
          await this.collection('dishes').doc(doc._id).update({
            data: {
              hasImages: images.length > 0,
              hasRecipeImages: recipeImages.length > 0,
              images: [],
              recipeImages: []
            }
          });
          console.log(`[迁移] 文档更新成功: ${doc.name}`);
        } catch (err) {
          console.error(`[迁移] 文档更新失败(权限问题): ${doc.name}`, err.message || err);
          // 图片已存到 dish_images，但原文档未更新，继续迁移下一个
        }

        migrated++;
        if (onProgress) onProgress(total, doc.name, 'done');
      }

      skip++;
    }

    console.log(`迁移完成: 共处理 ${total} 个菜品，迁移 ${migrated} 个`);
    return { total, migrated };
  }
}

module.exports = new DB();

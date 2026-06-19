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
}

module.exports = new DB();

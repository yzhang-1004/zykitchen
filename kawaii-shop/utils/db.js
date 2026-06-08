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
      const result = await this.collection(collection).add({
        data: {
          ...data,
          createTime: now,
          updateTime: now
        }
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
   */
  async get(collection, where = {}, limit = 100) {
    try {
      const result = await this.collection(collection)
        .where(where)
        .limit(limit)
        .orderBy('createTime', 'desc')
        .get();
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
}

module.exports = new DB();

const app = getApp();
const db = require('../../utils/db');

Page({
  data: {
    starCount: 0,
    title: '',
    titleIcon: '',
    cookHistory: []
  },

  onShow() {
    // 注册数据加载完成回调
    app.onDataLoaded(() => {
      this.loadData();
    });
  },
  
  // 下拉刷新
  async onPullDownRefresh() {
    try {
      // 从云端重新加载数据
      await app.refreshData();
      
      // 刷新页面数据
      this.loadData();
      
      // 停止下拉刷新动画
      wx.stopPullDownRefresh();
      
      // 显示成功提示
      wx.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1000
      });
    } catch (err) {
      wx.stopPullDownRefresh();
      wx.showToast({
        title: '刷新失败',
        icon: 'none'
      });
      console.error('刷新失败:', err);
    }
  },

  loadData() {
    const starCount = app.globalData.starCount || 0;
    const cookHistory = app.globalData.cookHistory || [];
    
    // 计算头衔
    let title, titleIcon;
    if (starCount >= 30) {
      title = '传奇食神';
      titleIcon = '👑';
    } else if (starCount >= 16) {
      title = '米其林大厨';
      titleIcon = '👨‍🍳';
    } else if (starCount >= 6) {
      title = '美味魔法师';
      titleIcon = '🪄';
    } else {
      title = '厨房小当家';
      titleIcon = '🐣';
    }

    this.setData({
      starCount,
      title,
      titleIcon,
      cookHistory
    });
  },
  
  // 增加星星
  async increaseStar() {
    const newCount = this.data.starCount + 1;
    await this.updateStarCount(newCount);
  },
  
  // 减少星星
  async decreaseStar() {
    if (this.data.starCount <= 0) {
      wx.showToast({
        title: '已经是0颗星星了~',
        icon: 'none'
      });
      return;
    }
    const newCount = this.data.starCount - 1;
    await this.updateStarCount(newCount);
  },
  
  // 更新星星数（本地+云端）
  async updateStarCount(newCount) {
    const oldCount = this.data.starCount;
    const diff = newCount - oldCount;
    app.globalData.starCount = newCount;
    this.loadData();
    
    try {
      const myOpenid = await db.getOpenid();
      const result = await db.get('user_stats', { _openid: myOpenid }, 1);
      
      if (result.success && result.data.length > 0) {
        const docId = result.data[0]._id;
        const _ = db._;
        await db.collection('user_stats').doc(docId).update({
          data: { starCount: _.inc(diff) }
        });
      } else {
        await db.add('user_stats', {
          starCount: newCount,
          cookHistory: []
        });
      }
    } catch (err) {
      console.error('同步星星数失败:', err);
    }
  },
  
  // 删除烹饪记录
  async deleteCookRecord(e) {
    const record = e.currentTarget.dataset.record;
    const index = e.currentTarget.dataset.index;
    
    wx.showModal({
      title: '删除确认',
      content: `确定删除「${record.dishName}」的烹饪记录吗？星星数也会减少${record.stars}颗。`,
      success: async (res) => {
        if (res.confirm) {
          const cookHistory = [...this.data.cookHistory];
          cookHistory.splice(index, 1);
          const newStarCount = Math.max(0, this.data.starCount - record.stars);
          
          this.setData({ cookHistory, starCount: newStarCount });
          app.globalData.starCount = newStarCount;
          app.globalData.cookHistory = cookHistory;
          this.loadData();
          
          await this.syncUserStats(newStarCount, cookHistory);
          wx.showToast({ title: '已删除', icon: 'success' });
        }
      }
    });
  },
  
  // 同步用户统计数据到云端
  async syncUserStats(starCount, cookHistory) {
    try {
      const myOpenid = await db.getOpenid();
      const result = await db.get('user_stats', { _openid: myOpenid }, 1);
      if (result.success && result.data.length > 0) {
        await db.update('user_stats', result.data[0]._id, {
          starCount, cookHistory
        });
      }
    } catch (err) {
      console.error('同步失败:', err);
    }
  }
});

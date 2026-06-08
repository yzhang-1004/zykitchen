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
    // 1. 更新本地数据
    app.globalData.starCount = newCount;
    
    // 2. 重新计算头衔
    this.loadData();
    
    // 3. 同步到云数据库
    try {
      const result = await db.get('user_stats', {}, 1);
      if (result.success && result.data.length > 0) {
        // 有记录，更新
        await db.update('user_stats', result.data[0]._id, {
          starCount: newCount
        });
        console.log('更新星星数成功:', newCount);
      } else {
        // 没有记录，新增
        const addResult = await db.add('user_stats', {
          starCount: newCount,
          cookHistory: []
        });
        console.log('创建星星记录成功:', addResult);
      }
    } catch (err) {
      console.error('同步星星数失败:', err);
    }
  }
});

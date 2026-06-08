const app = getApp();

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
  }
});

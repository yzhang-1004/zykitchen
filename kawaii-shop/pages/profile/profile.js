const app = getApp();

Page({
  data: {
    starCount: 0,
    title: '',
    titleIcon: '',
    cookHistory: []
  },

  onShow() {
    // 等待数据加载完成
    if (app.globalData.dataLoading) {
      wx.showLoading({ title: '加载中...', icon: 'none' });
      const checkDataLoaded = setInterval(() => {
        if (!app.globalData.dataLoading) {
          clearInterval(checkDataLoaded);
          wx.hideLoading();
          this.loadData();
        }
      }, 100);
    } else {
      this.loadData();
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

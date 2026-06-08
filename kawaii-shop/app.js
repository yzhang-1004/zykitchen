App({
  onLaunch() {
    console.log('ZY厨房小程序启动啦~ 🎉');
    console.log('当前环境:', __wxConfig.envVersion);
    console.log('基础库版本:', wx.version);
    
    // 开发版强制清除缓存
    if (__wxConfig.envVersion === 'develop') {
      try {
        wx.clearStorageSync();
        console.log('开发版已清除本地存储');
      } catch (e) {
        console.error('清除存储失败:', e);
      }
    }
    
    // 检查更新
    if (wx.getUpdateManager) {
      const updateManager = wx.getUpdateManager();
      updateManager.onCheckForUpdate(function (res) {
        console.log('是否有新版本？', res.hasUpdate);
      });
      updateManager.onUpdateReady(function () {
        wx.showModal({
          title: '更新提示',
          content: '新版本已经准备好，是否重启应用？',
          success: function (res) {
            if (res.confirm) {
              updateManager.applyUpdate();
            }
          }
        });
      });
    }
    
    // 初始化全局数据（菜品和待做初始为空，用户自行添加）
    if (!this.globalData.dishes) {
      this.globalData.dishes = [];
    }
    if (!this.globalData.cartItems) {
      this.globalData.cartItems = [];
    }
    if (!this.globalData.todoOrders) {
      this.globalData.todoOrders = [];
    }
    if (!this.globalData.starCount) {
      this.globalData.starCount = 0;
    }
    if (!this.globalData.cookHistory) {
      this.globalData.cookHistory = [];
    }
  },
  globalData: {
    dishes: [],           // 菜品列表
    cartItems: [],        // 点菜篮 [{dish, quantity}]
    todoOrders: [],       // 待做菜品 [{id, dishName, dish, quantity, time, recipeSteps}]
    starCount: 0,         // 星星总数
    cookHistory: []       // 烹饪记录 [{dishName, time, stars}]
  }
})
App({
  async onLaunch() {
    console.log('ZY厨房小程序启动啦~ 🎉');
    console.log('当前环境:', __wxConfig.envVersion);
    console.log('基础库版本:', wx.version);
    
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
    } else {
      wx.cloud.init({
        env: 'kawaii-shop-xxxxx',  // TODO: 请替换为您的云环境ID
        traceUser: true
      });
      console.log('云开发初始化成功');
      
      // 从云数据库加载数据
      await this.loadUserData();
    }
    
    // 开发版强制清除缓存
    if (__wxConfig.envVersion === 'develop') {
      try {
        // 注意：不清除云数据库数据，只清除本地缓存
        // wx.clearStorageSync(); 
        console.log('开发版已启动');
      } catch (e) {
        console.error('错误:', e);
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
    
    // 初始化全局数据（如果从云端加载失败，使用空数组）
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
  
  /**
   * 从云数据库加载用户数据
   */
  async loadUserData() {
    const db = require('./utils/db');
    
    wx.showLoading({ title: '加载数据中...', icon: 'none' });
    
    try {
      // 并行加载所有数据
      const [dishesRes, cartRes, todoRes, statsRes] = await Promise.all([
        db.get('dishes'),
        db.get('cart_items'),
        db.get('todo_orders', { status: 'pending' }),
        db.get('user_stats')
      ]);
      
      // 更新全局数据
      if (dishesRes.success) {
        this.globalData.dishes = dishesRes.data;
        console.log('加载菜品:', dishesRes.data.length);
      }
      
      if (cartRes.success && cartRes.data.length > 0) {
        this.globalData.cartItems = cartRes.data[0].items || [];
        console.log('加载购物车:', this.globalData.cartItems.length);
      }
      
      if (todoRes.success) {
        this.globalData.todoOrders = todoRes.data;
        console.log('加载待做订单:', todoRes.data.length);
      }
      
      if (statsRes.success && statsRes.data.length > 0) {
        this.globalData.starCount = statsRes.data[0].starCount || 0;
        this.globalData.cookHistory = statsRes.data[0].cookHistory || [];
        console.log('加载统计数据: 星星', this.globalData.starCount);
      }
      
      console.log('数据加载完成 ✅');
    } catch (err) {
      console.error('加载数据失败:', err);
      wx.showToast({
        title: '数据加载失败',
        icon: 'none'
      });
    } finally {
      wx.hideLoading();
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
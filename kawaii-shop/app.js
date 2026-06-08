App({
  onLaunch() {
    console.log('ZY厨房小程序启动啦~ 🎉');
    console.log('当前环境:', __wxConfig.envVersion);
    console.log('基础库版本:', wx.version);
    
    // 设置加载状态
    this.globalData.dataLoading = true;
    this.globalData.dataLoadCallbacks = [];
    
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力');
      this.globalData.dataLoading = false;
    } else {
      wx.cloud.init({
        env: 'cloud1-d8g71kyh480d81f35',  // 云环境ID
        traceUser: true
      });
      console.log('云开发初始化成功');
      
      // 从云数据库加载数据（异步后台加载，不阻塞启动）
      this.loadUserData();
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
      console.log('开始加载数据...');
      
      // 先获取openid（可能较慢，有本地缓存）
      const myOpenid = await db.getOpenid();
      console.log('openid:', myOpenid);
      
      // 并行加载所有数据
      const [dishesRes, cartRes, todoRes, statsRes] = await Promise.all([
        db.get('dishes'),
        db.get('cart_items', { _openid: myOpenid }),
        db.get('todo_orders', { status: 'pending', _openid: myOpenid }),
        db.get('user_stats', { _openid: myOpenid })
      ]);
      
      // 更新全局数据
      if (dishesRes.success) {
        this.globalData.dishes = dishesRes.data;
        console.log('加载菜品:', dishesRes.data.length);
      }
      
      if (cartRes.success && cartRes.data.length > 0) {
        this.globalData.cartItems = cartRes.data[0].items || [];
      }
      
      if (todoRes.success) {
        this.globalData.todoOrders = todoRes.data;
      }
      
      if (statsRes.success && statsRes.data.length > 0) {
        this.globalData.starCount = statsRes.data[0].starCount || 0;
        this.globalData.cookHistory = statsRes.data[0].cookHistory || [];
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
      this.globalData.dataLoading = false;
      this.notifyDataLoaded();
    }
  },
  
  /**
   * 注册数据加载完成回调
   */
  onDataLoaded(callback) {
    if (this.globalData.dataLoading) {
      // 还在加载中，添加到回调列表
      this.globalData.dataLoadCallbacks.push(callback);
    } else {
      // 已经加载完成，立即执行
      callback();
    }
  },
  
  /**
   * 通知所有页面数据加载完成
   */
  notifyDataLoaded() {
    const callbacks = this.globalData.dataLoadCallbacks || [];
    callbacks.forEach(cb => cb());
    this.globalData.dataLoadCallbacks = [];
  },
  
  /**
   * 刷新数据（公开方法，供页面调用）
   */
  async refreshData() {
    await this.loadUserData();
    this.notifyDataLoaded();
  },
  globalData: {
    dishes: [],           // 菜品列表
    cartItems: [],        // 点菜篮 [{dish, quantity}]
    todoOrders: [],       // 待做菜品 [{id, dishName, dish, quantity, time, recipeSteps}]
    starCount: 0,         // 星星总数
    cookHistory: [],      // 烹饪记录 [{dishName, time, stars}]
    dataLoading: false    // 数据加载状态
  }
})